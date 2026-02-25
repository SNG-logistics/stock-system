import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST /api/products/[id]/image — upload product image
export const POST = withAuth(async (req: NextRequest, { params }) => {
    const id = params?.id
    if (!id) return err('Missing product id')

    try {
        const formData = await req.formData()
        const file = formData.get('image') as File | null
        if (!file) return err('ไม่พบไฟล์รูปภาพ')

        // Validate file
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
        if (!allowedTypes.includes(file.type)) {
            return err('รองรับเฉพาะ JPEG, PNG, WebP')
        }
        if (file.size > 5 * 1024 * 1024) {
            return err('ไฟล์ขนาดเกิน 5MB')
        }

        // Check product exists
        const product = await prisma.product.findUnique({ where: { id } })
        if (!product) return err('ไม่พบสินค้า', 404)

        // Save file
        const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
        const filename = `${id}.${ext}`
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products')
        
        await mkdir(uploadDir, { recursive: true })
        
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(path.join(uploadDir, filename), buffer)

        // Update product imageUrl
        const imageUrl = `/uploads/products/${filename}?t=${Date.now()}`
        await prisma.product.update({
            where: { id },
            data: { imageUrl },
        })

        return ok({ imageUrl })
    } catch (error) {
        console.error('Image upload error:', error)
        return err('อัปโหลดรูปไม่สำเร็จ')
    }
}, ['OWNER', 'MANAGER'])
