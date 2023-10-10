const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;
const tmdbApiKey = '516adf1e1567058f8ecbf30bf2eb9378';

app.get('/', async (req, res) => {
  try {
    const filmesInfo = await extrairFilmesInfo();
    const htmlResponse = await gerarPaginaHTML(filmesInfo);
    res.send(htmlResponse);
  } catch (error) {
    res.status(500).send('Erro ao extrair as informações dos filmes.');
  }
});

async function extrairFilmesInfo() {
  try {
    const response = await axios.get('https://api.allorigins.win/raw?url=https://yts.proxyninja.org/');
    const html = response.data;
    const $ = cheerio.load(html);

    const filmesInfo = [];

    const filmesPromises = [];

    $('.browse-movie-wrap:lt(4)').each((index, elemento) => {
      const title = $(elemento).find('.browse-movie-title').text().trim();
      const trailerLink = getYouTubeLink(title);
      filmesPromises.push(buscarCapaFilme(title));
      filmesInfo.push({ title, trailerLink });
    });

    // Aguardar todas as solicitações de capa do filme serem concluídas
    const capasFilmes = await Promise.all(filmesPromises);

    // Adicionar as URLs das capas ao array de informações dos filmes
    capasFilmes.forEach((capa, index) => {
      filmesInfo[index].posterUrl = capa;
    });

    return filmesInfo;
  } catch (error) {
    throw error;
  }
}

async function buscarCapaFilme(title) {
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(title)}`;
    const tmdbResponse = await axios.get(tmdbUrl);

    if (tmdbResponse.data.results.length > 0) {
      const posterPath = tmdbResponse.data.results[0].poster_path;
      const posterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
      return posterUrl;
    }
  } catch (error) {
    console.error(`Erro ao buscar capa para ${title}: ${error.message}`);
    return ''; // Retorna uma string vazia em caso de erro
  }
}

async function gerarPaginaHTML(filmesInfo) {
  const filmesHTMLPromises = filmesInfo.map(({ title, posterUrl, trailerLink }) => {
    return `
      <li>
        <h2>${title}</h2>
        <img src="${posterUrl}" alt="Capa do Filme">
        <a href="${trailerLink}" target="_blank">Ver Trailer no YouTube</a>
      </li>
    `;
  });

  const filmesHTML = await Promise.all(filmesHTMLPromises);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Filmes Populares</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #f0f0f0;
          margin: 0;
          padding: 0;
        }

        h1 {
          text-align: center;
          color: #333;
        }

        ul {
          list-style: none;
          padding: 0;
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
        }

        li {
          background-color: #fff;
          border: 1px solid #ddd;
          margin: 10px;
          padding: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          width: 300px;
          text-align: center;
        }

        img {
          max-width: 100%;
          height: auto;
          margin-top: 10px;
          width: 100%;
        }

        a {
          color: #007BFF;
          text-decoration: none;
          font-weight: bold;
        }

        a:hover {
          color: #0056b3;
        }
      </style>
    </head>
    <body>
      <h1>4 Filmes Mais Populares</h1>
      <ul>${filmesHTML.join('')}</ul>
    </body>
    </html>
  `;
}

function getYouTubeLink(title) {
  const sanitizedTitle = title.replace(/\s/g, '+');
  const keywords = 'official+trailer';
  return `https://www.youtube.com/results?search_query=${sanitizedTitle}+${keywords}`;
}

app.listen(port, () => {
  console.log(`Servidor está rodando em http://localhost:${port}`);
});
