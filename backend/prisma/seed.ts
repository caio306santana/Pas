import { PrismaClient, UserRole, ProductLabel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Tenant (Menino Travesso)
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'menino-travesso' },
    update: {
      logoUrl: '/logo.png',
      themeColor: '#E58A14',
    },
    create: {
      slug: 'menino-travesso',
      name: 'Menino Travesso',
      logoUrl: '/logo.png', // Local premium image
      bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
      themeColor: '#E58A14', // Premium golden orange
      configs: {
        create: {
          operatingHours: {
            monday: { open: '18:00', close: '23:30' },
            tuesday: { open: '18:00', close: '23:30' },
            wednesday: { open: '18:00', close: '23:30' },
            thursday: { open: '18:00', close: '23:30' },
            friday: { open: '18:00', close: '00:30' },
            saturday: { open: '18:00', close: '01:00' },
            sunday: { open: '18:00', close: '23:30' },
          },
          whatsappNumber: '5511999999999',
          deliveryMinTime: 25,
          deliveryMaxTime: 45,
          paymentSettings: {
            pixActive: true,
            cardActive: true,
            cashActive: true,
          },
          cashbackPercent: 5.0, // 5% cashback
        },
      },
    },
  });

  console.log(`Tenant created/found: ${tenant.name} (${tenant.slug})`);

  // 2. Create Staff Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const staffUsers = [
    { email: 'admin@menino.com', name: 'Administrador Menino', role: UserRole.ADMIN },
    { email: 'manager@menino.com', name: 'Gerente Menino', role: UserRole.MANAGER },
    { email: 'kitchen@menino.com', name: 'Chefe da Cozinha', role: UserRole.KITCHEN },
    { email: 'cashier@menino.com', name: 'Operador de Caixa', role: UserRole.CASHIER },
    { email: 'courier@menino.com', name: 'Entregador Rápido', role: UserRole.COURIER },
  ];

  for (const staff of staffUsers) {
    await prisma.user.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        email: staff.email,
        name: staff.name,
        password: passwordHash,
        role: staff.role,
        tenantId: tenant.id,
      },
    });
  }
  console.log('Staff users seeded.');

  // 3. Create Delivery Areas
  const deliveryAreas = [
    { neighborhood: 'Centro', fee: 5.0, estimatedTime: 30 },
    { neighborhood: 'Jardim América', fee: 7.0, estimatedTime: 35 },
    { neighborhood: 'Vila Madalena', fee: 10.0, estimatedTime: 45 },
    { neighborhood: 'Bela Vista', fee: 8.0, estimatedTime: 40 },
  ];

  for (const area of deliveryAreas) {
    const existing = await prisma.deliveryArea.findFirst({
      where: { tenantId: tenant.id, neighborhood: area.neighborhood },
    });
    if (!existing) {
      await prisma.deliveryArea.create({
        data: {
          neighborhood: area.neighborhood,
          fee: area.fee,
          estimatedTime: area.estimatedTime,
          tenantId: tenant.id,
        },
      });
    }
  }
  console.log('Delivery areas seeded.');

  // 4. Create Coupons
  const couponExp = new Date();
  couponExp.setFullYear(couponExp.getFullYear() + 1); // 1 year expiry
  await prisma.coupon.upsert({
    where: {
      tenantId_code: { tenantId: tenant.id, code: 'BEMVINDO' },
    },
    update: {},
    create: {
      code: 'BEMVINDO',
      discountType: 'PERCENTAGE',
      value: 10,
      minOrderValue: 30,
      expiresAt: couponExp,
      tenantId: tenant.id,
    },
  });
  await prisma.coupon.upsert({
    where: {
      tenantId_code: { tenantId: tenant.id, code: 'MENINO10' },
    },
    update: {},
    create: {
      code: 'MENINO10',
      discountType: 'FIXED',
      value: 10.0,
      minOrderValue: 40,
      expiresAt: couponExp,
      tenantId: tenant.id,
    },
  });
  console.log('Coupons seeded.');

  // 5. Create Categories
  const categoriesData = [
    { name: 'Pastéis Salgados', slug: 'pasteis-salgados', order: 1 },
    { name: 'Pastéis Doces', slug: 'pasteis-doces', order: 2 },
    { name: 'Churros', slug: 'churros', order: 3 },
    { name: 'Bebidas', slug: 'bebidas', order: 4 },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const dbCat = await prisma.category.upsert({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: cat.slug },
      },
      update: { order: cat.order },
      create: {
        name: cat.name,
        slug: cat.slug,
        order: cat.order,
        tenantId: tenant.id,
      },
    });
    categories[cat.slug] = dbCat.id;
  }
  console.log('Categories seeded.');

  // 6. Create Products
  // Pastéis Salgados
  const pasteis = [
    {
      name: 'Pastel Especial de Carne',
      description: 'Carne moída temperada premium, ovo cozido picado, azeitona verde fatiada e queijo mussarela derretido.',
      price: 18.9,
      categoryId: categories['pasteis-salgados'],
      label: ProductLabel.BESTSELLER,
      imageUrl: '/pastel-carne.png',
      options: [
        {
          name: 'Escolha a Massa',
          minSelect: 1,
          maxSelect: 1,
          items: [
            { name: 'Tradicional', price: 0.0 },
            { name: 'Integral', price: 1.0 },
            { name: 'Temperada (Ervas)', price: 1.5 },
          ],
        },
        {
          name: 'Tamanho do Pastel',
          minSelect: 1,
          maxSelect: 1,
          items: [
            { name: 'Médio (20cm)', price: 0.0 },
            { name: 'Grande (30cm)', price: 5.0 },
            { name: 'Mega (40cm)', price: 10.0 },
          ],
        },
        {
          name: 'Extras Opcionais',
          minSelect: 0,
          maxSelect: 5,
          items: [
            { name: 'Dobro de Queijo', price: 3.5 },
            { name: 'Bacon Crocante', price: 4.0 },
            { name: 'Catupiry Original', price: 3.0 },
          ],
        },
      ],
    },
    {
      name: 'Pastel de Frango com Catupiry',
      description: 'Peito de frango desfiado suculento com Catupiry original.',
      price: 16.9,
      categoryId: categories['pasteis-salgados'],
      label: ProductLabel.NEW,
      imageUrl: '/pastel-frango.png',
      options: [
        {
          name: 'Escolha a Massa',
          minSelect: 1,
          maxSelect: 1,
          items: [
            { name: 'Tradicional', price: 0.0 },
            { name: 'Integral', price: 1.0 },
          ],
        },
        {
          name: 'Extras Opcionais',
          minSelect: 0,
          maxSelect: 3,
          items: [
            { name: 'Mussarela Extra', price: 3.0 },
            { name: 'Azeitona fatiada', price: 1.0 },
          ],
        },
      ],
    },
    {
      name: 'Pastel de Três Queijos',
      description: 'Combinação perfeita de Mussarela, Provolone defumado e Catupiry.',
      price: 15.9,
      categoryId: categories['pasteis-salgados'],
      label: null,
      imageUrl: '/pastel-queijo.png',
      options: [
        {
          name: 'Escolha a Massa',
          minSelect: 1,
          maxSelect: 1,
          items: [
            { name: 'Tradicional', price: 0.0 },
            { name: 'Temperada (Ervas)', price: 1.5 },
          ],
        },
      ],
    },
  ];

  // Pastéis Doces
  const pasteisDoces = [
    {
      name: 'Pastel de Chocolate com Morango',
      description: 'Recheio cremoso de chocolate ao leite Nestlé com morangos frescos fatiados.',
      price: 17.9,
      categoryId: categories['pasteis-doces'],
      label: ProductLabel.EXCLUSIVE,
      imageUrl: '/pastel-chocolate.png',
      options: [
        {
          name: 'Tipo de Chocolate',
          minSelect: 1,
          maxSelect: 1,
          items: [
            { name: 'Chocolate ao Leite', price: 0.0 },
            { name: 'Nutella', price: 3.0 },
            { name: 'Chocolate Branco', price: 0.5 },
          ],
        },
        {
          name: 'Adicionais Doces',
          minSelect: 0,
          maxSelect: 2,
          items: [
            { name: 'Leite Condensado', price: 2.0 },
            { name: 'Banana Fatiada', price: 1.5 },
          ],
        },
      ],
    },
    {
      name: 'Pastel de Romeu e Julieta',
      description: 'O clássico queijo mussarela derretido com goiabada cascão cremosa.',
      price: 14.9,
      categoryId: categories['pasteis-doces'],
      label: null,
      imageUrl: '/pastel-queijo.png',
      options: [],
    },
  ];

  // Churros
  const churros = [
    {
      name: 'Churros Tradicional Doce de Leite',
      description: 'Churros frito na hora, recheado com o melhor doce de leite cremoso, polvilhado com açúcar e canela.',
      price: 9.9,
      categoryId: categories['churros'],
      label: ProductLabel.BESTSELLER,
      imageUrl: '/churros-tradicional.png',
      options: [
        {
          name: 'Escolha o Recheio principal',
          minSelect: 1,
          maxSelect: 1,
          items: [
            { name: 'Doce de Leite Viçosa', price: 0.0 },
            { name: 'Nutella Original', price: 2.5 },
            { name: 'Chocolate Gourmet', price: 1.0 },
          ],
        },
        {
          name: 'Escolha a Cobertura extra',
          minSelect: 0,
          maxSelect: 1,
          items: [
            { name: 'Calda de Chocolate', price: 1.5 },
            { name: 'Leite Condensado', price: 1.5 },
          ],
        },
        {
          name: 'Confeitos (Granulados)',
          minSelect: 0,
          maxSelect: 2,
          items: [
            { name: 'Granulado de Chocolate', price: 0.5 },
            { name: 'Confetes coloridos', price: 0.8 },
            { name: 'Coco Ralado', price: 0.5 },
          ],
        },
      ],
    },
    {
      name: 'Copo de Mini Churros',
      description: 'Copo recheado com 10 mini churros sequinhos e crocantes, acompanhados de uma porção generosa de calda.',
      price: 15.9,
      categoryId: categories['churros'],
      label: ProductLabel.PROMO,
      imageUrl: '/copo-churros.png',
      options: [
        {
          name: 'Escolha o Molho Dip',
          minSelect: 1,
          maxSelect: 1,
          items: [
            { name: 'Pote de Doce de Leite', price: 0.0 },
            { name: 'Pote de Nutella', price: 3.0 },
          ],
        },
      ],
    },
  ];

  // Bebidas
  const bebidas = [
    {
      name: 'Refrigerante em Lata (Coca-Cola)',
      description: 'Lata de 350ml de Coca-Cola gelada.',
      price: 6.0,
      categoryId: categories['bebidas'],
      label: null,
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
      options: [
        {
          name: 'Temperatura',
          minSelect: 1,
          maxSelect: 1,
          items: [
            { name: 'Gelada', price: 0.0 },
            { name: 'Natural', price: 0.0 },
          ],
        },
      ],
    },
    {
      name: 'Suco Natural de Laranja',
      description: 'Suco natural feito da fruta na hora, garrafa de 500ml.',
      price: 8.9,
      categoryId: categories['bebidas'],
      label: null,
      imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80',
      options: [
        {
          name: 'Gelo e Açúcar',
          minSelect: 1,
          maxSelect: 1,
          items: [
            { name: 'Com gelo e açúcar', price: 0.0 },
            { name: 'Apenas gelo (sem açúcar)', price: 0.0 },
            { name: 'Natural puro', price: 0.0 },
          ],
        },
      ],
    },
    {
      name: 'Água Mineral sem Gás',
      description: 'Garrafa de 500ml.',
      price: 4.0,
      categoryId: categories['bebidas'],
      label: null,
      imageUrl: 'https://images.unsplash.com/photo-1608885898957-a599fb1863fc?w=500&auto=format&fit=crop&q=80',
      options: [],
    },
  ];

  const allProductsData = [...pasteis, ...pasteisDoces, ...churros, ...bebidas];

  for (const prod of allProductsData) {
    const existingProduct = await prisma.product.findFirst({
      where: { tenantId: tenant.id, name: prod.name },
    });

    if (!existingProduct) {
      const dbProd = await prisma.product.create({
        data: {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          categoryId: prod.categoryId,
          label: prod.label,
          imageUrl: prod.imageUrl,
          tenantId: tenant.id,
        },
      });

      for (const group of prod.options) {
        const dbGroup = await prisma.productOptionGroup.create({
          data: {
            name: group.name,
            minSelect: group.minSelect,
            maxSelect: group.maxSelect,
            productId: dbProd.id,
          },
        });

        for (const item of group.items) {
          await prisma.productOption.create({
            data: {
              name: item.name,
              price: item.price,
              productOptionGroupId: dbGroup.id,
            },
          });
        }
      }
    } else {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          imageUrl: prod.imageUrl,
          price: prod.price,
          description: prod.description,
        },
      });
    }
  }

  console.log('Products & options seeded successfully.');
  console.log('Seeding complete! Admin user: admin@menino.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
