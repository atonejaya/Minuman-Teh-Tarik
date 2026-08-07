const fs = require('fs');
const path = require('path');

const models = [
  { name: 'CustomerCategory', route: 'categories', dir: 'category' },
  { name: 'Regional', route: 'regionals', dir: 'regional' },
  { name: 'Area', route: 'areas', dir: 'area' },
  { name: 'Route', route: 'routes', dir: 'route' }
];

const basePath = path.join(__dirname, 'src/modules/master');

models.forEach(m => {
  const serviceCode = \`const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class \${m.name}Service {
  async getAll(query = {}) {
    const where = {};
    if (query.is_active !== undefined) {
      where.is_active = query.is_active === 'true';
    }
    return await prisma.\${m.name.charAt(0).toLowerCase() + m.name.slice(1)}.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async getById(id) {
    return await prisma.\${m.name.charAt(0).toLowerCase() + m.name.slice(1)}.findUnique({ where: { id: parseInt(id) } });
  }

  async create(data) {
    return await prisma.\${m.name.charAt(0).toLowerCase() + m.name.slice(1)}.create({ data });
  }

  async update(id, data) {
    return await prisma.\${m.name.charAt(0).toLowerCase() + m.name.slice(1)}.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, is_active) {
    return await prisma.\${m.name.charAt(0).toLowerCase() + m.name.slice(1)}.update({
      where: { id: parseInt(id) },
      data: { is_active }
    });
  }
}

module.exports = new \${m.name}Service();
\`;

  const controllerCode = \`const \${m.name}Service = require('../services/\${m.name}Service');

class \${m.name}Controller {
  async getAll(req, res) {
    try {
      const data = await \${m.name}Service.getAll(req.query);
      res.json({ success: true, generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const data = await \${m.name}Service.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async create(req, res) {
    try {
      const data = await \${m.name}Service.create(req.body);
      res.status(201).json({ success: true, generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const data = await \${m.name}Service.update(req.params.id, req.body);
      res.json({ success: true, generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const data = await \${m.name}Service.updateStatus(req.params.id, req.body.is_active);
      res.json({ success: true, generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new \${m.name}Controller();
\`;

  const routeCode = \`const express = require('express');
const router = express.Router();
const controller = require('../controllers/\${m.name}Controller');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', controller.getAll);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
\`;

  fs.writeFileSync(path.join(basePath, \`\${m.dir}/services/\${m.name}Service.js\`), serviceCode);
  fs.writeFileSync(path.join(basePath, \`\${m.dir}/controllers/\${m.name}Controller.js\`), controllerCode);
  fs.writeFileSync(path.join(basePath, \`\${m.dir}/routes/\${m.route}.routes.js\`), routeCode);
});

console.log('CRUD boilerplate generated.');
