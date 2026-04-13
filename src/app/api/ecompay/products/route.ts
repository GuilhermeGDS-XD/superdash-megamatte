import { NextResponse } from 'next/server';
import EcompayService from '@/services/ecompayService';

export async function GET() {
  try {
    console.log('🔄 Iniciando busca de produtos Ecompay...');
    const data = await EcompayService.getProducts();
    
    console.log('📊 Resposta bruta da API:', JSON.stringify(data, null, 2));
    
    // Processa a resposta de diferentes formatos possíveis
    const productList = Array.isArray(data) 
      ? data 
      : data.products || data.data || [];
    
    console.log('✅ Produtos processados:', productList.length);
    
    return NextResponse.json({
      products: productList,
      success: true,
      count: productList.length,
    });
  } catch (error: any) {
    console.error('❌ Erro na rota /api/ecompay/products:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: error.message, success: false, details: error.stack },
      { status: 500 }
    );
  }
}
