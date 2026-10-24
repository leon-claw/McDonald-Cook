import { ApiError, type Store, type TakeWay } from './types.js';

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(502, '麦当劳返回的数据格式无法识别。', 'MCP_RESPONSE_ERROR');
  return value as Record<string, unknown>;
}
export function string(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(502, '麦当劳返回的数据字段不完整。', 'MCP_RESPONSE_ERROR');
  return value;
}
export function parseToolResult(value: unknown): unknown {
  const result = object(value);
  if (result.isError) throw new ApiError(502, '麦当劳服务未完成此次操作，请稍后检查。', 'MCP_TOOL_ERROR');
  let raw = result.structuredContent;
  if (!raw) {
    const content = Array.isArray(result.content) ? result.content : [];
    const text = content.filter(item => item.type === 'text').map(item => item.text ?? '').join('\n');
    try { raw = JSON.parse(text); }
    catch { throw new ApiError(502, '麦当劳返回格式无法识别。', 'MCP_RESPONSE_ERROR'); }
  }
  const envelope = object(raw);
  if (envelope.success === false || (envelope.code !== undefined && envelope.code !== 200 && envelope.code !== '200')) {
    throw new ApiError(502, '麦当劳未能完成查询，请检查门店营业状态后重试。', 'MCP_BUSINESS_ERROR');
  }
  return raw;
}
export function parseStores(raw: unknown): Store[] {
  const data = object(raw).data;
  if (!Array.isArray(data)) throw new ApiError(502, '无法读取麦当劳门店列表。', 'MCP_RESPONSE_ERROR');
  return data.map(value => {
    const item = object(value);
    return {
      code: string(item.storeCode), name: string(item.storeName), address: string(item.address),
      open: item.businessStatus === true,
      hours: `${string(item.businessStartTime)}–${string(item.businessEndTime)}`,
      reservationOptions: Array.isArray(item.reservationTimeOptions) ? item.reservationTimeOptions.map(value => {
        const option = object(value);
        return { date: string(option.date), today: option.today === true, text: string(option.reservationOptionText) };
      }) : [],
    };
  });
}
export function parseTakeWays(raw: unknown): TakeWay[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new ApiError(502, '当前门店没有可用的取餐方式。', 'NO_TAKE_WAY');
  return raw.map(value => {
    const item = object(value);
    return { code: string(item.code), title: string(item.title), subtitle: typeof item.subtitle === 'string' ? item.subtitle : undefined };
  });
}
function defaultModification(detail: Record<string, unknown>) {
  const values: { code: string; key: string; quantity: number }[] = [];
  if (detail.modification) {
    const groups = object(detail.modification).items;
    if (!Array.isArray(groups)) throw new ApiError(502, '无法读取餐品的标准配方。', 'MCP_RESPONSE_ERROR');
    for (const group of groups) {
      const options = object(group).values;
      if (!Array.isArray(options)) throw new ApiError(502, '无法读取餐品的标准配方。', 'MCP_RESPONSE_ERROR');
      for (const option of options) {
        const value = object(option), quantity = value.selectedQuantity;
        if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0
          || (typeof value.minQuantity === 'number' && quantity < value.minQuantity)
          || (typeof value.maxQuantity === 'number' && value.maxQuantity >= 0 && quantity > value.maxQuantity)) {
          throw new ApiError(502, '餐品的默认配方不完整。', 'MCP_RESPONSE_ERROR');
        }
        const key = quantity > 0 ? value.selectedKey : value.unselectedKey;
        if (quantity > 0 || key) values.push({ code: string(value.code), key: string(key), quantity });
      }
    }
  }
  return values.length ? { modification: { values } } : {};
}
export function singleChoiceRound(detail: Record<string, unknown>) {
  if (!Array.isArray(detail.rounds) || detail.rounds.length !== 1) {
    throw new ApiError(409, '该餐品需要选配，请选择对应的单品。', 'PRODUCT_REQUIRES_CHOICES');
  }
  const round = object(detail.rounds[0]);
  if (round.minQuantity !== 1 || round.maxQuantity !== 1 || !Array.isArray(round.choices)
    || !['string', 'number'].includes(typeof round.id) || !String(round.id)) {
    throw new ApiError(409, '该餐品需要选配，请选择对应的单品。', 'PRODUCT_REQUIRES_CHOICES');
  }
  return { id: String(round.id), choices: round.choices.map(object) };
}
// Only one standard item, or one explicitly selected child of a one-choice single item.
export function standardItem(raw: unknown, productId: string, choice?: { round: string; code: string }) {
  const detail = object(object(raw).data);
  if (detail.code !== productId) throw new ApiError(502, '餐品详情与所选商品不一致。', 'MCP_RESPONSE_ERROR');
  if (choice) {
    const round = singleChoiceRound(detail);
    const selected = round.choices.find(value => value.code === choice.code);
    if (round.id !== choice.round || !selected || (Array.isArray(selected.rounds) && selected.rounds.length)) {
      throw new ApiError(409, '所选餐品款式已不可用，请重新烹饪。', 'PRODUCT_UNAVAILABLE');
    }
    return { name: string(selected.name), supportModify: selected.supportModify === true,
      item: { productCode: productId, quantity: 1, ...defaultModification(detail),
        roundList: [{ round: round.id, comboItemList: [{ code: choice.code, quantity: 1, ...defaultModification(selected) }] }] } };
  }
  if (!Array.isArray(detail.rounds) || detail.rounds.length > 0) throw new ApiError(409, '该餐品需要选配，请选择对应的单品。', 'PRODUCT_REQUIRES_CHOICES');
  return { name: string(detail.name), supportModify: detail.supportModify === true,
    item: { productCode: productId, quantity: 1, ...defaultModification(detail) } };
}
