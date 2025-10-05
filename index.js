const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

app.get('/resultado', async (req, res) => {
    const { loteria, concurso } = req.query;

    if (!loteria || !concurso) {
        return res.status(400).json({ error: 'Parâmetros "loteria" e "concurso" são obrigatórios.' });
    }

    const apiUrl = `https://apiloterias.com.br/app/resultado?loteria=${loteria}&concurso=${concurso}`;

    try {
        const response = await fetch(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!response.ok) {
            throw new Error(`A API da loteria retornou um erro: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        res.status(500).json({ error: `Erro ao buscar o resultado: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy rodando na porta ${PORT}`);
});
