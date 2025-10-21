// services/mockMl.ts
export async function mockTryOn(payload: {
  person_b64: string;
  garment_b64?: string;
  garment_url?: string;
}) {
  // จำลองเวลา infer
  await new Promise((r) => setTimeout(r, 900));
  // คืนรูปคนเดิมเป็นผลลัพธ์ชั่วคราว
  return { result_b64: payload.person_b64 };
}
