/**
 * add-categories.js — เพิ่ม EGG, DAIRY, CHEESE, FLOUR_DOUGH ลง DB
 * รัน: node scripts/add-categories.js
 */
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient({ log: [] })

const NEW_CATS = [
    { code: 'EGG', name: 'ไข่ทุกชนิด', nameEn: 'Eggs', color: '#FBBF24', icon: '🥚' },
    { code: 'DAIRY', name: 'นม/ครีม/เนย', nameEn: 'Dairy', color: '#FDE68A', icon: '🥛' },
    { code: 'CHEESE', name: 'ชีสทุกชนิด', nameEn: 'Cheese', color: '#F59E0B', icon: '🧀' },
    { code: 'FLOUR_DOUGH', name: 'แป้ง/โดว์/แป้งพิซซ่า', nameEn: 'Flour/Dough', color: '#D6D3D1', icon: '🫓' },
]

async function main() {
    console.log('\n➕ เพิ่ม Categories...\n')
    for (const cat of NEW_CATS) {
        const result = await p.category.upsert({
            where: { code: cat.code },
            update: { name: cat.name, nameEn: cat.nameEn, color: cat.color, icon: cat.icon },
            create: cat,
        })
        console.log(`  ✅ ${result.code} — ${result.name} (${result.icon})`)
    }
    console.log('\n🎉 เสร็จแล้ว!')
}

main().catch(console.error).finally(() => p.$disconnect())
