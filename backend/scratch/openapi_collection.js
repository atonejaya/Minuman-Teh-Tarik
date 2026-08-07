const fs = require('fs');
const path = 'C:/Users/lingg/.gemini/antigravity/brain/1cea73f5-e311-488f-90b0-5e0d73f4095c/openapi.yaml';
let content = fs.readFileSync(path, 'utf8');

const collectionPaths = `
  /collections:
    post:
      tags:
        - Collection
      summary: Create a new collection session
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateCollectionRequest'
      responses:
        '201':
          description: Collection created
    get:
      tags:
        - Collection
      summary: Get all collections
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of collections

  /collections/{id}:
    get:
      tags:
        - Collection
      summary: Get collection details
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
          description: Collection details

  /collections/{id}/invoices:
    post:
      tags:
        - Collection
      summary: Add an invoice to collection
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [transaction_id]
              properties:
                transaction_id:
                  type: integer
      responses:
        '201':
          description: Invoice added

  /collections/{id}/finish:
    post:
      tags:
        - Collection
      summary: Finish a collection session
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                failure_reason:
                  type: string
                notes:
                  type: string
      responses:
        '200':
          description: Collection finished
`;

const collectionSchemas = `
    Collection:
      type: object
      properties:
        id:
          type: integer
        code:
          type: string
        sales_id:
          type: integer
        warung_id:
          type: integer
        visit_id:
          type: integer
        collection_date:
          type: string
          format: date-time
        status:
          type: string
          enum: [PENDING, COMPLETED, FAILED]
        result:
          type: string
          enum: [FULL, PARTIAL, NONE]
        failure_reason:
          type: string
        notes:
          type: string
        created_at:
          type: string
          format: date-time
        items:
          type: array
          items:
            $ref: '#/components/schemas/CollectionItem'
        payments:
          type: array
          items:
            $ref: '#/components/schemas/Payment'
        summary:
          $ref: '#/components/schemas/CollectionSummary'

    CollectionItem:
      type: object
      properties:
        id:
          type: integer
        collection_id:
          type: integer
        sales_transaction_id:
          type: integer
        invoice_total:
          type: number
        outstanding_before:
          type: number
        payment_amount:
          type: number
        outstanding_after:
          type: number

    CollectionSummary:
      type: object
      properties:
        total_invoice:
          type: number
        total_outstanding:
          type: number
        total_collected:
          type: number
        remaining_outstanding:
          type: number

    CreateCollectionRequest:
      type: object
      required:
        - warung_id
        - visit_id
        - collection_date
      properties:
        warung_id:
          type: integer
        visit_id:
          type: integer
        collection_date:
          type: string
          format: date-time
        notes:
          type: string
`;

// Inject schemas
content = content.replace('components:\n  schemas:', 'components:\n  schemas:' + collectionSchemas);

// Inject paths
content = content.replace('  /users:', collectionPaths + '\n  /users:');

// Alter CreatePaymentRequest schema to include collection_id
content = content.replace('amount:\n          type: number\n        notes:\n          type: string', 'amount:\n          type: number\n        notes:\n          type: string\n        collection_id:\n          type: integer');

fs.writeFileSync(path, content);
console.log('OpenAPI updated');
