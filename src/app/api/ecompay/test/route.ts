import EcompayService from '@/services/ecompayService';

export async function GET() {
  try {
    console.log('🔍 === TESTE DE CONECTIVIDADE ECOMPAY ===');
    console.log('📧 Email:', process.env.ECOMPAY_EMAIL);
    console.log('🔐 Password exists:', !!process.env.ECOMPAY_PASSWORD);
    
    // Teste simples de connectivity
    console.log('🌐 Testando conexão com https://api.ecompay.app/user/login');
    
    const testResponse = await fetch('https://api.ecompay.app/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ECOMPAY_EMAIL || 'teste@teste.com.br',
        password: process.env.ECOMPAY_PASSWORD || 'teste123',
      }),
    });

    console.log('✅ Conectou! Status:', testResponse.status);
    const testData = await testResponse.json();
    console.log('📝 Resposta:', JSON.stringify(testData, null, 2));

    return Response.json({
      success: true,
      status: testResponse.status,
      response: testData,
      message: 'Teste de conectividade bem-sucedido',
    });
  } catch (error: any) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Stack:', error.stack);
    
    return Response.json({
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      details: error.stack,
    }, { status: 500 });
  }
}
