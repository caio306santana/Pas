import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_CLEAR_ORDERS !== 'true') {
    throw new Error(
      'Operacao bloqueada. Defina CONFIRM_CLEAR_ORDERS=true para apagar todos os pedidos.',
    );
  }

  console.log('Resetando todos os pedidos de teste no banco de dados...');
  const result = await prisma.order.deleteMany({});
  console.log(`Sucesso! Foram excluidos ${result.count} pedidos.`);
}

main()
  .catch((error) => {
    console.error('Erro ao resetar os pedidos:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
