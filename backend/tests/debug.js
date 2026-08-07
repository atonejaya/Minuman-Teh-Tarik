const Joi = require('joi');
const { createCustomerSchema } = require('../src/modules/master/customer/validators/CustomerValidator');

const testPayload = {
  name: 'Test Customer API 1',
  visit_day: 'MONDAY',
  assigned_sales_id: 1,
  category_id: 1,
  area_id: 1,
  route_id: 1
};

const { error, value } = createCustomerSchema.validate(testPayload);
if (error) {
  console.log('Validation Error:', error.details);
} else {
  console.log('Validation Success:', value);
}
