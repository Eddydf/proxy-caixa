const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

// Função para buscar na API 1 (Mais Rápida)
async function tryApi1(loteria, concurso) {
    const apiUrl = `https://apiloterias.com.br/app/resultado?loteria=${loteria}&concurso=${concurso}`;
    const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('API 1 falhou');
    const data = await response.json();
    if (!data || !data.numero_concurso) throw new Error('API 1 não encontrou o concurso');
    return data;
}

// Função para buscar na API 2 (Plano B)
async function tryApi2(loteria, concurso) {
    if (loteria === 'megasena') loteria = 'mega-sena';
    const apiUrl = `https://loterias.S-S.workers.dev/api/v2/resultados?modalidade=${loteria}&concurso=${concurso}`;
    const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('API 2 falhou');
    const data = await response.json();
    if (!data || !data.data || !data.data.concurso) throw new Error('API 2 não encontrou o concurso');
    
    // "Traduz" a resposta da API 2 para o formato que o seu site espera
    const d = data.data;
    return {
        numero_concurso: d.concurso, dezenas: d.numeros, trevos: d.trevos || [],
        data_concurso: d.data,
        premiacao: d.premiacao.map(p => ({ nome: p.faixa, acertadores: p.ganhadores, valor_pago: `R$ ${p.valor.toFixed(2)}` }))
    };
}

// Função para buscar na API 3 (Plano C - Oficial da Caixa)
async function tryApi3(loteria, concurso) {
    if (loteria === 'megasena') loteria = 'mega-sena';
    const apiUrl = `https://servicebus2.caixa.gov.br/portaldeloterias/api/${loteria.replace('-sena', 'sena')}/${concurso}`;
    const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('API 3 (Caixa) falhou');
    const data = await response.json();
    if (!data || data.numero != concurso) throw new Error('API 3 (Caixa) não encontrou o concurso');

    // "Traduz" a resposta da API 3
    return {
        numero_concurso: data.numero,
        dezenas: data.dezenasSorteadasOrdemSorteio || data.listaDezenas,
        trevos: data.trevosSorteados || [],
        data_concurso: data.dataApuracao,
        premiacao: data.listaRateioPremio.map(p => ({ nome: p.descricaoFaixa, acertadores: p.numeroDeGanhadores, valor_pago: `R$ ${p.valorPremio.toFixed(2)}` }))
    };
}


app.get('/resultado', async (req, res) => {
    const { loteria, concurso } = req.query;

    if (!loteria || !concurso) {
        return res.status(400).json({ error: 'Parâmetros "loteria" e "concurso" são obrigatórios.' });
    }

    // Tenta as APIs em sequência
    try {
        const data = await tryApi1(loteria, concurso);
        return res.json(data);
    } catch (error1) {
        console.warn(`API 1 falhou: ${error1.message}. Tentando API 2...`);
        try {
            const data = await tryApi2(loteria, concurso);
            return res.json(data);
        } catch (error2) {
            console.warn(`API 2 falhou: ${error2.message}. Tentando API 3...`);
            try {
                const data = await tryApi3(loteria, concurso);
                return res.json(data);
            } catch (error3) {
                console.error(`Todas as APIs falharam. Último erro: ${error3.message}`);
                return res.status(500).json({ error: `Todas as APIs falharam. Último erro: ${error3.message}` });
            }
        }
    }
});

app.listen(PORT, () => {
    console.log(`Proxy super robusto rodando na porta ${PORT}`);
});
