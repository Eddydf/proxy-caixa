const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

// Função para tentar buscar na API 1
async function tryApi1(loteria, concurso) {
    const apiUrl = `https://apiloterias.com.br/app/resultado?loteria=${loteria}&concurso=${concurso}`;
    const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('API 1 falhou');
    const data = await response.json();
    if (!data || !data.numero_concurso) throw new Error('API 1 não encontrou o concurso');
    return data;
}

// Função para tentar buscar na API 2 (Plano B)
async function tryApi2(loteria, concurso) {
    // Ajusta o nome do jogo para o formato da API 2
    if (loteria === 'megasena') loteria = 'mega-sena';

    const apiUrl = `https://loterias.S-S.workers.dev/api/v2/resultados?modalidade=${loteria}&concurso=${concurso}`;
    const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('API 2 falhou');
    const data = await response.json();
    if (!data || !data.data || !data.data.concurso) throw new Error('API 2 não encontrou o concurso');
    
    // "Traduz" a resposta da API 2 para o formato da API 1
    const concursoData = data.data;
    return {
        numero_concurso: concursoData.concurso,
        dezenas: concursoData.numeros,
        trevos: concursoData.trevos || [],
        data_concurso: concursoData.data,
        premiacao: concursoData.premiacao.map(p => ({
            nome: p.faixa,
            acertadores: p.ganhadores,
            valor_pago: `R$ ${p.valor.toFixed(2)}`
        }))
    };
}

app.get('/resultado', async (req, res) => {
    const { loteria, concurso } = req.query;

    if (!loteria || !concurso) {
        return res.status(400).json({ error: 'Parâmetros "loteria" e "concurso" são obrigatórios.' });
    }

    try {
        // Tenta a primeira API
        console.log(`Tentando API 1 para ${loteria}/${concurso}`);
        const data = await tryApi1(loteria, concurso);
        console.log('Sucesso com API 1!');
        res.json(data);
    } catch (error1) {
        console.warn(`API 1 falhou: ${error1.message}. Tentando API 2 (Plano B)...`);
        try {
            // Se a primeira falhar, tenta a segunda
            const data = await tryApi2(loteria, concurso);
            console.log('Sucesso com API 2!');
            res.json(data);
        } catch (error2) {
            console.error(`API 2 também falhou: ${error2.message}`);
            res.status(500).json({ error: `Erro em todas as APIs. Último erro: ${error2.message}` });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Proxy robusto rodando na porta ${PORT}`);
});
