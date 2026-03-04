import { PrismaClient, LocationType, ProductType, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding 43 Garden database...')

    // ============================================================
    // LOCATIONS — 7 คลัง
    // ============================================================
    const locations = await Promise.all([
        prisma.location.upsert({ where: { code: 'WH_MAIN' }, update: {}, create: { code: 'WH_MAIN', name: 'คลังใหญ่', nameLao: 'ຄັງໃຫຍ່', type: LocationType.MAIN_WAREHOUSE, sortOrder: 1 } }),
        prisma.location.upsert({ where: { code: 'WH_FRESH' }, update: {}, create: { code: 'WH_FRESH', name: 'คลังของสด', nameLao: 'ຄັງຂອງສົດ', type: LocationType.FRESH_STORAGE, sortOrder: 2 } }),
        prisma.location.upsert({ where: { code: 'WH_DRINKbar1' }, update: {}, create: { code: 'WH_DRINKbar1', name: 'คลังเครื่องดื่ม 1', nameLao: 'ຄັງເຄື່ອງດື່ມ 1', type: LocationType.DRINK_WAREHOUSE, sortOrder: 3 } }),
        prisma.location.upsert({ where: { code: 'WH_DRINKbar2' }, update: {}, create: { code: 'WH_DRINKbar2', name: 'คลังเครื่องดื่ม 2', nameLao: 'ຄັງເຄື່ອງດື່ມ 2', type: LocationType.DRINK_WAREHOUSE, sortOrder: 4 } }),
        prisma.location.upsert({ where: { code: 'FR_FREEZER' }, update: {}, create: { code: 'FR_FREEZER', name: 'ตู้แช่หน้าร้าน', nameLao: 'ຕູ້ແຊ່ໜ້າຮ້ານ', type: LocationType.DISPLAY_FREEZER, sortOrder: 5 } }),
        prisma.location.upsert({ where: { code: 'KIT_STOCK' }, update: {}, create: { code: 'KIT_STOCK', name: 'สต็อคครัว', nameLao: 'ສະຕ໋ອກເຄື່ອງຄົວ', type: LocationType.KITCHEN_STOCK, sortOrder: 6 } }),
        prisma.location.upsert({ where: { code: 'BAR_STOCK' }, update: {}, create: { code: 'BAR_STOCK', name: 'สต็อคบาร์', nameLao: 'ສະຕ໋ອກບາ', type: LocationType.BAR_STOCK, sortOrder: 7 } }),
    ])
    console.log(`✅ Locations: ${locations.length}`)

    // ============================================================
    // CATEGORIES
    // ============================================================
    const categories = await Promise.all([
        prisma.category.upsert({ where: { code: 'BEER' }, update: {}, create: { code: 'BEER', name: 'เบียร์', nameEn: 'Beer', color: '#F59E0B', icon: '🍺' } }),
        prisma.category.upsert({ where: { code: 'BEER_DRAFT' }, update: {}, create: { code: 'BEER_DRAFT', name: 'เบียร์สด/ทาวเวอร์', nameEn: 'Draft Beer', color: '#D97706', icon: '🍻' } }),
        prisma.category.upsert({ where: { code: 'WINE' }, update: {}, create: { code: 'WINE', name: 'ไวน์/วิสกี้', nameEn: 'Wine/Whisky', color: '#7C3AED', icon: '🍷' } }),
        prisma.category.upsert({ where: { code: 'COCKTAIL' }, update: {}, create: { code: 'COCKTAIL', name: 'ค็อกเทล', nameEn: 'Cocktail', color: '#EC4899', icon: '🍹' } }),
        prisma.category.upsert({ where: { code: 'DRINK' }, update: {}, create: { code: 'DRINK', name: 'เครื่องดื่ม', nameEn: 'Drink', color: '#06B6D4', icon: '🥤' } }),
        prisma.category.upsert({ where: { code: 'WATER' }, update: {}, create: { code: 'WATER', name: 'น้ำดื่ม/น้ำแข็ง', nameEn: 'Water/Ice', color: '#38BDF8', icon: '💧' } }),
        prisma.category.upsert({ where: { code: 'FOOD_GRILL' }, update: {}, create: { code: 'FOOD_GRILL', name: 'อาหารปิ้งย่าง', nameEn: 'Grilled Food', color: '#EF4444', icon: '🍖' } }),
        prisma.category.upsert({ where: { code: 'FOOD_FRY' }, update: {}, create: { code: 'FOOD_FRY', name: 'อาหารทอด', nameEn: 'Fried Food', color: '#F97316', icon: '🍟' } }),
        prisma.category.upsert({ where: { code: 'FOOD_SEA' }, update: {}, create: { code: 'FOOD_SEA', name: 'อาหารทะเล', nameEn: 'Seafood', color: '#3B82F6', icon: '🦐' } }),
        prisma.category.upsert({ where: { code: 'FOOD_VEG' }, update: {}, create: { code: 'FOOD_VEG', name: 'ผัก/ต้ม/แกง', nameEn: 'Veg/Soup', color: '#22C55E', icon: '🥦' } }),
        prisma.category.upsert({ where: { code: 'FOOD_LAAB' }, update: {}, create: { code: 'FOOD_LAAB', name: 'ยำ/ลาบ', nameEn: 'Salad/Laab', color: '#84CC16', icon: '🥗' } }),
        prisma.category.upsert({ where: { code: 'FOOD_RICE' }, update: {}, create: { code: 'FOOD_RICE', name: 'ข้าว/ข้าวผัด', nameEn: 'Rice', color: '#CA8A04', icon: '🍚' } }),
        prisma.category.upsert({ where: { code: 'FOOD_NOODLE' }, update: {}, create: { code: 'FOOD_NOODLE', name: 'ก๋วยเตี๋ยว/เส้น', nameEn: 'Noodle', color: '#A16207', icon: '🍜' } }),
        prisma.category.upsert({ where: { code: 'SET' }, update: {}, create: { code: 'SET', name: 'โปร/เซ็ต', nameEn: 'Set/Promo', color: '#8B5CF6', icon: '🎯' } }),
        prisma.category.upsert({ where: { code: 'KARAOKE' }, update: {}, create: { code: 'KARAOKE', name: 'ห้องคาราโอเกะ', nameEn: 'Karaoke Room', color: '#EC4899', icon: '🎤' } }),
        prisma.category.upsert({ where: { code: 'ENTERTAIN' }, update: {}, create: { code: 'ENTERTAIN', name: 'Entertain/PR', nameEn: 'Entertainment', color: '#6B7280', icon: '🎭' } }),
        // วัตถุดิบ
        prisma.category.upsert({ where: { code: 'RAW_MEAT' }, update: {}, create: { code: 'RAW_MEAT', name: 'เนื้อสัตว์/ไก่', nameEn: 'Meat/Poultry', color: '#DC2626', icon: '🥩' } }),
        prisma.category.upsert({ where: { code: 'RAW_PORK' }, update: {}, create: { code: 'RAW_PORK', name: 'เนื้อหมู', nameEn: 'Pork', color: '#F87171', icon: '🐷' } }),
        prisma.category.upsert({ where: { code: 'RAW_SEA' }, update: {}, create: { code: 'RAW_SEA', name: 'อาหารทะเลดิบ', nameEn: 'Raw Seafood', color: '#0EA5E9', icon: '🦑' } }),
        prisma.category.upsert({ where: { code: 'RAW_VEG' }, update: {}, create: { code: 'RAW_VEG', name: 'ผัก/วัตถุดิบสด', nameEn: 'Vegetables', color: '#16A34A', icon: '🥬' } }),
        prisma.category.upsert({ where: { code: 'DRY_GOODS' }, update: {}, create: { code: 'DRY_GOODS', name: 'เครื่องปรุง/แห้ง', nameEn: 'Dry Goods', color: '#92400E', icon: '🧂' } }),
        prisma.category.upsert({ where: { code: 'PACKAGING' }, update: {}, create: { code: 'PACKAGING', name: 'บรรจุภัณฑ์', nameEn: 'Packaging', color: '#9CA3AF', icon: '📦' } }),
        // วัตถุดิบกลุ่มใหม่
        prisma.category.upsert({ where: { code: 'EGG' }, update: {}, create: { code: 'EGG', name: 'ไข่ทุกชนิด', nameEn: 'Eggs', color: '#FBBF24', icon: '🥚' } }),
        prisma.category.upsert({ where: { code: 'DAIRY' }, update: {}, create: { code: 'DAIRY', name: 'นม/ครีม/เนย', nameEn: 'Dairy', color: '#FDE68A', icon: '🥛' } }),
        prisma.category.upsert({ where: { code: 'CHEESE' }, update: {}, create: { code: 'CHEESE', name: 'ชีสทุกชนิด', nameEn: 'Cheese', color: '#F59E0B', icon: '🧀' } }),
        prisma.category.upsert({ where: { code: 'FLOUR_DOUGH' }, update: {}, create: { code: 'FLOUR_DOUGH', name: 'แป้ง/โดว์/พิซซ่าเบส', nameEn: 'Flour/Dough', color: '#D6D3D1', icon: '🫓' } }),
        prisma.category.upsert({ where: { code: 'OTHER' }, update: {}, create: { code: 'OTHER', name: 'อื่นๆ', nameEn: 'Other', color: '#6B7280', icon: '❓' } }),
    ])
    console.log(`✅ Categories: ${categories.length}`)
    const cat = Object.fromEntries(categories.map(c => [c.code, c.id]))

    // ============================================================
    // USERS
    // ============================================================
    const ownerHash = await bcrypt.hash('owner1234', 12)
    const managerHash = await bcrypt.hash('manager1234', 12)
    const staffHash = await bcrypt.hash('staff1234', 12)

    await Promise.all([
        prisma.user.upsert({ where: { username: 'owner' }, update: {}, create: { username: 'owner', passwordHash: ownerHash, name: 'เจ้าของร้าน', role: Role.OWNER } }),
        prisma.user.upsert({ where: { username: 'manager' }, update: {}, create: { username: 'manager', passwordHash: managerHash, name: 'ผู้จัดการ', role: Role.MANAGER } }),
        prisma.user.upsert({ where: { username: 'warehouse' }, update: {}, create: { username: 'warehouse', passwordHash: staffHash, name: 'คลังสินค้า', role: Role.WAREHOUSE } }),
        prisma.user.upsert({ where: { username: 'kitchen' }, update: {}, create: { username: 'kitchen', passwordHash: staffHash, name: 'ครัว', role: Role.KITCHEN } }),
        prisma.user.upsert({ where: { username: 'bar' }, update: {}, create: { username: 'bar', passwordHash: staffHash, name: 'บาร์', role: Role.BAR } }),
        prisma.user.upsert({ where: { username: 'cashier' }, update: {}, create: { username: 'cashier', passwordHash: staffHash, name: 'แคชเชียร์', role: Role.CASHIER } }),
    ])
    console.log('✅ Users: 6')

    // ============================================================
    // DINING TABLES — 20 โต๊ะ
    // ============================================================
    const diningTables = [
        // ในร้าน (indoor) — Tables 1-8
        { number: 1, name: 'โต๊ะ 1', zone: 'ในร้าน', seats: 4 },
        { number: 2, name: 'โต๊ะ 2', zone: 'ในร้าน', seats: 4 },
        { number: 3, name: 'โต๊ะ 3', zone: 'ในร้าน', seats: 4 },
        { number: 4, name: 'โต๊ะ 4', zone: 'ในร้าน', seats: 6 },
        { number: 5, name: 'โต๊ะ 5', zone: 'ในร้าน', seats: 6 },
        { number: 6, name: 'โต๊ะ 6', zone: 'ในร้าน', seats: 2 },
        { number: 7, name: 'โต๊ะ 7', zone: 'ในร้าน', seats: 2 },
        { number: 8, name: 'โต๊ะ 8', zone: 'ในร้าน', seats: 8 },
        // ระเบียง (terrace) — Tables 9-15
        { number: 9, name: 'โต๊ะ 9', zone: 'ระเบียง', seats: 4 },
        { number: 10, name: 'โต๊ะ 10', zone: 'ระเบียง', seats: 4 },
        { number: 11, name: 'โต๊ะ 11', zone: 'ระเบียง', seats: 4 },
        { number: 12, name: 'โต๊ะ 12', zone: 'ระเบียง', seats: 6 },
        { number: 13, name: 'โต๊ะ 13', zone: 'ระเบียง', seats: 6 },
        { number: 14, name: 'โต๊ะ 14', zone: 'ระเบียง', seats: 4 },
        { number: 15, name: 'โต๊ะ 15', zone: 'ระเบียง', seats: 8 },
        // VIP — Tables 16-20
        { number: 16, name: 'VIP 1', zone: 'VIP', seats: 8 },
        { number: 17, name: 'VIP 2', zone: 'VIP', seats: 10 },
        { number: 18, name: 'VIP 3', zone: 'VIP', seats: 12 },
        { number: 19, name: 'VIP 4', zone: 'VIP', seats: 6 },
        { number: 20, name: 'VIP 5', zone: 'VIP', seats: 8 },
    ]

    let tableCount = 0
    for (const t of diningTables) {
        await prisma.diningTable.upsert({
            where: { number: t.number },
            update: { name: t.name, zone: t.zone, seats: t.seats },
            create: { ...t, status: 'AVAILABLE' },
        })
        tableCount++
    }
    console.log(`✅ Dining Tables: ${tableCount}`)

    // ============================================================
    // PRODUCTS — SKU ระบบ: [หมวด]-[ลำดับ] เช่น B001 = เบียร์ตัวที่ 1
    // ============================================================
    // SKU Prefix:
    //   B = เบียร์ขวด, BD = เบียร์สด, W = ไวน์/สุรา, CK = ค็อกเทล
    //   D = เครื่องดื่ม, WI = น้ำ/น้ำแข็ง
    //   FG = อาหารปิ้งย่าง, FF = อาหารทอด, FS = อาหารทะเล
    //   FV = ผัก/ต้ม/แกง, FL = ยำ/ลาบ, FR = ข้าว, FN = เส้น
    //   ST = เซ็ต/โปร, KR = คาราโอเกะ, EN = Entertain
    //   RM = เนื้อสัตว์ดิบ, RP = หมูดิบ, RS = ทะเลดิบ
    //   RV = ผักสด, DG = เครื่องปรุง/แห้ง, PK = บรรจุภัณฑ์
    // ============================================================
    const products = [
        // ══════════════════ สินค้าขาย (SALE_ITEM) ══════════════════

        // ──── 🍺 B: เบียร์ขวด ─────────────────────────────────
        { sku: 'B001', name: 'Beer Lao ขวดใหญ่', unit: 'ขวด', salePrice: 30000, costPrice: 18000, reorderPoint: 24, minQty: 12, categoryId: cat['BEER'], productType: ProductType.SALE_ITEM },
        { sku: 'B002', name: 'Beer Lao กระป๋อง', unit: 'กระป๋อง', salePrice: 20000, costPrice: 12000, reorderPoint: 24, minQty: 12, categoryId: cat['BEER'], productType: ProductType.SALE_ITEM },
        { sku: 'B003', name: 'Heineken ขวดใหญ่', unit: 'ขวด', salePrice: 45000, costPrice: 28000, reorderPoint: 24, minQty: 12, categoryId: cat['BEER'], productType: ProductType.SALE_ITEM },
        { sku: 'B004', name: 'Carlsberg ขวดใหญ่', unit: 'ขวด', salePrice: 35000, costPrice: 22000, reorderPoint: 24, minQty: 12, categoryId: cat['BEER'], productType: ProductType.SALE_ITEM },
        { sku: 'B005', name: 'Tiger ขวดใหญ่', unit: 'ขวด', salePrice: 35000, costPrice: 22000, reorderPoint: 12, minQty: 6, categoryId: cat['BEER'], productType: ProductType.SALE_ITEM },

        // ──── 🍻 BD: เบียร์สด/ทาวเวอร์ ───────────────────────
        { sku: 'BD01', name: 'Heineken สด (ทาวเวอร์)', unit: 'ทาวเวอร์', salePrice: 199000, costPrice: 90000, reorderPoint: 0, minQty: 0, categoryId: cat['BEER_DRAFT'], productType: ProductType.SALE_ITEM },
        { sku: 'BD02', name: 'Beer Lao สด (ทาวเวอร์)', unit: 'ทาวเวอร์', salePrice: 159000, costPrice: 70000, reorderPoint: 0, minQty: 0, categoryId: cat['BEER_DRAFT'], productType: ProductType.SALE_ITEM },

        // ──── 🍷 W: ไวน์/วิสกี้ ──────────────────────────────
        { sku: 'W001', name: 'Johnnie Walker Black Label', unit: 'ขวด', salePrice: 1299000, costPrice: 700000, reorderPoint: 2, minQty: 1, categoryId: cat['WINE'], productType: ProductType.SALE_ITEM },
        { sku: 'W002', name: 'Johnnie Walker Red Label', unit: 'ขวด', salePrice: 699000, costPrice: 380000, reorderPoint: 2, minQty: 1, categoryId: cat['WINE'], productType: ProductType.SALE_ITEM },
        { sku: 'W003', name: 'Penfolds BIN2 (2020)', unit: 'ขวด', salePrice: 990000, costPrice: 550000, reorderPoint: 2, minQty: 1, categoryId: cat['WINE'], productType: ProductType.SALE_ITEM },

        // ──── 🥤 D: เครื่องดื่ม ──────────────────────────────
        { sku: 'D001', name: 'Pepsi ขวดพลาสติก', unit: 'ขวด', salePrice: 30000, costPrice: 8000, reorderPoint: 12, minQty: 6, categoryId: cat['DRINK'], productType: ProductType.SALE_ITEM },
        { sku: 'D002', name: 'Pepsi กระป๋อง', unit: 'กระป๋อง', salePrice: 15000, costPrice: 7000, reorderPoint: 24, minQty: 12, categoryId: cat['DRINK'], productType: ProductType.SALE_ITEM },
        { sku: 'D003', name: 'Coca-Cola กระป๋อง', unit: 'กระป๋อง', salePrice: 15000, costPrice: 7000, reorderPoint: 12, minQty: 6, categoryId: cat['DRINK'], productType: ProductType.SALE_ITEM },
        { sku: 'D004', name: 'Sprite กระป๋อง', unit: 'กระป๋อง', salePrice: 15000, costPrice: 7000, reorderPoint: 12, minQty: 6, categoryId: cat['DRINK'], productType: ProductType.SALE_ITEM },
        { sku: 'D005', name: 'โซดา ขวดแก้ว', unit: 'ขวด', salePrice: 15000, costPrice: 5000, reorderPoint: 24, minQty: 12, categoryId: cat['DRINK'], productType: ProductType.SALE_ITEM },

        // ──── 💧 WI: น้ำดื่ม/น้ำแข็ง ─────────────────────────
        { sku: 'WI01', name: 'น้ำดื่ม ขวดเล็ก', unit: 'ขวด', salePrice: 10000, costPrice: 3000, reorderPoint: 24, minQty: 12, categoryId: cat['WATER'], productType: ProductType.SALE_ITEM },
        { sku: 'WI02', name: 'น้ำดื่ม ขวดกลาง', unit: 'ขวด', salePrice: 10000, costPrice: 3000, reorderPoint: 24, minQty: 12, categoryId: cat['WATER'], productType: ProductType.SALE_ITEM },
        { sku: 'WI03', name: 'น้ำดื่ม ขวดใหญ่', unit: 'ขวด', salePrice: 20000, costPrice: 5000, reorderPoint: 24, minQty: 12, categoryId: cat['WATER'], productType: ProductType.SALE_ITEM },
        { sku: 'WI04', name: 'น้ำแข็ง ถังเล็ก', unit: 'ถัง', salePrice: 15000, costPrice: 5000, reorderPoint: 10, minQty: 5, categoryId: cat['WATER'], productType: ProductType.SALE_ITEM },
        { sku: 'WI05', name: 'น้ำแข็ง ถังใหญ่', unit: 'ถัง', salePrice: 25000, costPrice: 8000, reorderPoint: 10, minQty: 5, categoryId: cat['WATER'], productType: ProductType.SALE_ITEM },

        // ──── 🍖 FG: อาหารปิ้งย่าง ───────────────────────────
        { sku: 'FG01', name: 'เสือร้องไห้ย่าง', unit: 'จาน', salePrice: 135000, costPrice: 55000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_GRILL'], productType: ProductType.SALE_ITEM },
        { sku: 'FG02', name: 'หมูย่าง', unit: 'จาน', salePrice: 120000, costPrice: 45000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_GRILL'], productType: ProductType.SALE_ITEM },
        { sku: 'FG03', name: 'ไก่ย่าง (ครึ่งตัว)', unit: 'จาน', salePrice: 119000, costPrice: 50000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_GRILL'], productType: ProductType.SALE_ITEM },
        { sku: 'FG04', name: 'แกะอบ', unit: 'ตัว', salePrice: 890000, costPrice: 500000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_GRILL'], productType: ProductType.SALE_ITEM },

        // ──── 🍟 FF: อาหารทอด ─────────────────────────────────
        { sku: 'FF01', name: 'เฟรนช์ฟรายส์', unit: 'จาน', salePrice: 85000, costPrice: 20000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_FRY'], productType: ProductType.SALE_ITEM },
        { sku: 'FF02', name: 'เอ็นไก่ทอดสมุนไพร', unit: 'จาน', salePrice: 95000, costPrice: 35000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_FRY'], productType: ProductType.SALE_ITEM },

        // ──── 🍚 FR: ข้าว/อาหารจานเดียว ──────────────────────
        { sku: 'FR01', name: 'ข้าวเหนียว 1 กล่อง', unit: 'กล่อง', salePrice: 15000, costPrice: 5000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_RICE'], productType: ProductType.SALE_ITEM },
        { sku: 'FR02', name: 'ข้าวเจ้า 1 จาน', unit: 'จาน', salePrice: 15000, costPrice: 5000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_RICE'], productType: ProductType.SALE_ITEM },
        { sku: 'FR03', name: 'ข้าวผัด จานเล็ก', unit: 'จาน', salePrice: 79000, costPrice: 25000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_RICE'], productType: ProductType.SALE_ITEM },
        { sku: 'FR04', name: 'ข้าวผัด จานใหญ่', unit: 'จาน', salePrice: 239000, costPrice: 60000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_RICE'], productType: ProductType.SALE_ITEM },
        { sku: 'FR05', name: 'ข้าวพนักงาน', unit: 'จาน', salePrice: 20000, costPrice: 8000, reorderPoint: 0, minQty: 0, categoryId: cat['FOOD_RICE'], productType: ProductType.SALE_ITEM },

        // ──── 🎤 KR: คาราโอเกะ ────────────────────────────────
        { sku: 'KR01', name: 'Heineken (คาราโอเกะ)', unit: 'ขวด', salePrice: 40000, costPrice: 28000, reorderPoint: 12, minQty: 6, categoryId: cat['KARAOKE'], productType: ProductType.SALE_ITEM },

        // ══════════════════ วัตถุดิบ (RAW_MATERIAL) ══════════════════

        // ──── 🥩 RM: เนื้อสัตว์/ไก่ ──────────────────────────
        { sku: 'RM01', name: 'ไก่ทั้งตัว', unit: 'กก.', salePrice: 0, costPrice: 0, reorderPoint: 10, minQty: 5, categoryId: cat['RAW_MEAT'], productType: ProductType.RAW_MATERIAL },
        { sku: 'RM02', name: 'เนื้อวัวสด', unit: 'กก.', salePrice: 0, costPrice: 0, reorderPoint: 5, minQty: 2, categoryId: cat['RAW_MEAT'], productType: ProductType.RAW_MATERIAL },

        // ──── 🐷 RP: เนื้อหมู ─────────────────────────────────
        { sku: 'RP01', name: 'หมูสามชั้น', unit: 'กก.', salePrice: 0, costPrice: 0, reorderPoint: 5, minQty: 2, categoryId: cat['RAW_PORK'], productType: ProductType.RAW_MATERIAL },

        // ──── 🦑 RS: อาหารทะเลดิบ ─────────────────────────────
        { sku: 'RS01', name: 'กุ้งสด', unit: 'กก.', salePrice: 0, costPrice: 0, reorderPoint: 3, minQty: 1, categoryId: cat['RAW_SEA'], productType: ProductType.RAW_MATERIAL },
        { sku: 'RS02', name: 'ปลาหมึกสด', unit: 'กก.', salePrice: 0, costPrice: 0, reorderPoint: 3, minQty: 1, categoryId: cat['RAW_SEA'], productType: ProductType.RAW_MATERIAL },

        // ──── 🥬 RV: ผัก/วัตถุดิบสด ──────────────────────────
        { sku: 'RV01', name: 'มันฝรั่ง', unit: 'กก.', salePrice: 0, costPrice: 0, reorderPoint: 5, minQty: 2, categoryId: cat['RAW_VEG'], productType: ProductType.RAW_MATERIAL },
        { sku: 'RV02', name: 'หัวหอมใหญ่', unit: 'กก.', salePrice: 0, costPrice: 0, reorderPoint: 5, minQty: 2, categoryId: cat['RAW_VEG'], productType: ProductType.RAW_MATERIAL },
        { sku: 'RV03', name: 'กระเทียม', unit: 'กก.', salePrice: 0, costPrice: 0, reorderPoint: 3, minQty: 1, categoryId: cat['RAW_VEG'], productType: ProductType.RAW_MATERIAL },

        // ──── 🧂 DG: เครื่องปรุง/ของแห้ง ─────────────────────
        { sku: 'DG01', name: 'ข้าวสาร', unit: 'กก.', salePrice: 0, costPrice: 0, reorderPoint: 20, minQty: 10, categoryId: cat['DRY_GOODS'], productType: ProductType.RAW_MATERIAL },
        { sku: 'DG02', name: 'ข้าวเหนียว', unit: 'กก.', salePrice: 0, costPrice: 0, reorderPoint: 10, minQty: 5, categoryId: cat['DRY_GOODS'], productType: ProductType.RAW_MATERIAL },
        { sku: 'DG03', name: 'น้ำมันพืช', unit: 'ลิตร', salePrice: 0, costPrice: 0, reorderPoint: 5, minQty: 2, categoryId: cat['DRY_GOODS'], productType: ProductType.RAW_MATERIAL },
        { sku: 'DG04', name: 'ซีอิ๊วขาว', unit: 'ขวด', salePrice: 0, costPrice: 0, reorderPoint: 3, minQty: 1, categoryId: cat['DRY_GOODS'], productType: ProductType.RAW_MATERIAL },
    ]

    let productCount = 0
    for (const p of products) {
        await prisma.product.upsert({
            where: { sku: p.sku },
            update: { name: p.name, salePrice: p.salePrice, costPrice: p.costPrice },
            create: { ...p, note: '' }
        })
        productCount++
    }
    console.log(`✅ Products: ${productCount}`)

    console.log('\n🎉 Seed completed!')
    console.log('📋 Login credentials:')
    console.log('   👑 owner     / owner1234')
    console.log('   📊 manager   / manager1234')
    console.log('   🏭 warehouse / staff1234')
    console.log('   🍳 kitchen   / staff1234')
    console.log('   🍸 bar       / staff1234')
    console.log('   💰 cashier   / staff1234')
}

main().catch(console.error).finally(() => prisma.$disconnect())
