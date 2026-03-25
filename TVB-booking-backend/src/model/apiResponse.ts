export type PayStatus = "paid" | "voucher_applied" | "waiting_list" | "already_registered" | "failed";

export interface PayResponse {
    status: PayStatus;
    paymentId?: string;
    message?: string;
}

export type RefundStatus = "refunded" | "deleted_no_payment" | "failed";

export interface RefundResponse {
    status: RefundStatus;
    message?: string;
}

export interface SpotsResponse {
    total: number;
    taken: number;
    remaining: number;
}
