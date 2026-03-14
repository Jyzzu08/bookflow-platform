from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="BookFlow Payments Mock", version="1.0.0")

class PaymentIn(BaseModel):
    order_id: str = Field(min_length=1)
    amount: float = Field(gt=0)
    currency: str = Field(default="EUR", min_length=3, max_length=3)

@app.get('/health')
def health():
    return {"service": "payments-mock", "status": "ok"}

@app.post('/v2/payments', status_code=201)
def create_payment(payload: PaymentIn):
    status = "succeeded" if payload.amount < 500 else "pending_review"
    return {
        "paymentId": f"pay_{payload.order_id}",
        "orderId": payload.order_id,
        "amount": payload.amount,
        "currency": payload.currency.upper(),
        "status": status,
        "createdAt": datetime.utcnow().isoformat()
    }
