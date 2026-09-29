package com.hetex.entity;

/**
 * Lifecycle status for wallet payment transactions.
 * <ul>
 *   <li>PENDING  – Razorpay order created; awaiting payment completion.</li>
 *   <li>SUCCESS  – Payment verified server-side; wallet credited.</li>
 *   <li>FAILED   – Payment failed or signature verification failed.</li>
 *   <li>REFUNDED – Payment reversed after a successful credit.</li>
 * </ul>
 */
public enum PaymentTxnStatus { PENDING, SUCCESS, FAILED, REFUNDED }
