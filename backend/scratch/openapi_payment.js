const fs = require('fs');
const path = 'C:/Users/lingg/.gemini/antigravity/brain/1cea73f5-e311-488f-90b0-5e0d73f4095c/openapi.yaml';
let content = fs.readFileSync(path, 'utf8');

const paymentPaths = `
  /payments:
    post:
      tags:
        - Payment
      summary: Create a new payment for an invoice
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePaymentRequest'
      responses:
        '201':
          description: Payment created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentResponse'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '409':
          $ref: '#/components/responses/ConflictError'
    get:
      tags:
        - Payment
      summary: Get all payments
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of payments
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Payment'

  /payments/{id}:
    get:
      tags:
        - Payment
      summary: Get payment details by ID
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Payment details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentResponse'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /sales-transactions/{id}/payments:
    get:
      tags:
        - SalesTransaction
      summary: Get all payments for a specific transaction
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: List of payments for transaction
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Payment'
`;

const paymentSchemas = `
    Payment:
      type: object
      properties:
        id:
          type: integer
        code:
          type: string
        payment_date:
          type: string
          format: date
        payment_method:
          type: string
          enum: [CASH, QRIS, TRANSFER, CREDIT]
        amount:
          type: number
        notes:
          type: string
          nullable: true
        created_at:
          type: string
          format: date-time

    CreatePaymentRequest:
      type: object
      required:
        - transaction_id
        - payment_method
        - payment_date
        - amount
      properties:
        transaction_id:
          type: integer
        payment_method:
          type: string
          enum: [CASH, QRIS, TRANSFER, CREDIT]
        payment_date:
          type: string
          format: date-time
        amount:
          type: number
        notes:
          type: string

    PaymentResponse:
      type: object
      properties:
        success:
          type: boolean
        message:
          type: string
        data:
          $ref: '#/components/schemas/Payment'
`;

// Inject schemas
content = content.replace('components:\n  schemas:', 'components:\n  schemas:' + paymentSchemas);

// Inject paths
content = content.replace('  /users:', paymentPaths + '\n  /users:');

// Alter SalesTransaction schema to include paid_amount and outstanding_amount
content = content.replace('grand_total:\n          type: number', 'grand_total:\n          type: number\n        paid_amount:\n          type: number\n        outstanding_amount:\n          type: number');

fs.writeFileSync(path, content);
console.log('OpenAPI updated');
