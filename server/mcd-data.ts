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
// The game orders a standard single item. Never silently choose a meal's components.
export function standardItem(raw: unknown, productId: string) {
  const detail = object(object(raw).data);
  if (detail.code !== productId) throw new ApiError(502, '餐品详情与所选商品不一致。', 'MCP_RESPONSE_ERROR');
  if (!Array.isArray(detail.rounds) || detail.rounds.length > 0) throw new ApiError(409, '该餐品需要选配，请选择对应的单品。', 'PRODUCT_REQUIRES_CHOICES');
  const values: { code: string; key: string; quantity: number }[] = [];
  if (detail.modification) {
    const groups = object(detail.modification).items;
    if (!Array.isArray(groups)) throw new ApiError(502, '无法读取餐品的标准配方。', 'MCP_RESPONSE_ERROR');
    for (const group of groups) {
      const options = object(group).values;
      if (!Array.isArray(options)) throw new ApiError(502, '无法读取餐品的标准配方。', 'MCP_RESPONSE_ERROR');
      for (const option of options) {
        const value = object(option);
        const quantity = value.selectedQuantity;
        if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) throw new ApiError(502, '餐品的默认配方不完整。', 'MCP_RESPONSE_ERROR');
        const key = quantity > 0 ? value.selectedKey : value.unselectedKey;
        if (quantity > 0 || key) values.push({ code: string(value.code), key: string(key), quantity });
      }
    }
  }
  return {
    name: string(detail.name), supportModify: detail.supportModify === true,
    item: { productCode: productId, quantity: 1, ...(values.length ? { modification: { values } } : {}) },
  };
}
