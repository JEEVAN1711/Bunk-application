// Standalone Local Service (SMS/WhatsApp messaging detached)

export const ADMIN_PHONE = '+919159054084';
export const AGENCY_NAME = 'Shri Sabthagiri Agency';

export async function sendDirectTwilioSms(targetPhone: string, messageBody: string): Promise<boolean> {
  return true;
}

export async function dispatchCreditSms(
  customerPhone: string | undefined,
  customerName: string,
  product: string,
  liters: number,
  amount: number,
  vehicleNo: string,
  newBalance: number,
  cashierName: string
) {
  return true;
}

export async function dispatchPaymentSms(
  customerPhone: string | undefined,
  customerName: string,
  amount: number,
  paymentMethod: string,
  newBalance: number,
  cashierName: string
) {
  return true;
}
