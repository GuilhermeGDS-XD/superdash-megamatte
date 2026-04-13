import { NextResponse } from 'next/server';
import EcompayService from '@/services/ecompayService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const metrics = await EcompayService.getSalesData(productId || undefined);

    return NextResponse.json({
      ...metrics,
      productId,
      success: true,
    });
  } catch (error: any) {
    console.error('Erro ao buscar métricas Ecompay:', error);
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}
