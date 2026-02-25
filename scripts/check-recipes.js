const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const recipes = await prisma.recipe.findMany({
        where: { isActive: true },
        include: {
            bom: {
                include: {
                    product: {
                        include: {
                            inventory: true
                        }
                    }
                }
            }
        },
        take: 3
    })
    console.log(JSON.stringify(recipes, null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
