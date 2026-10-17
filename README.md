# Forja

PWA de academia para iPhone, Android e desktop. Os treinos A–F, a biblioteca e o histórico ficam no aparelho e continuam disponíveis offline depois da primeira carga.

## Rodar

```bash
npm install
npm run dev
```

Abre em `http://127.0.0.1:4731`.

```bash
npm test
npm run lint
npm run build
```

## Instalar

- **iPhone:** abra no Safari, toque em Compartilhar e escolha **Adicionar à Tela de Início**. O app precisa de HTTPS (ou do endereço publicado). A splash e o ícone já estão configurados.
- **Android e desktop:** use o botão Instalar do navegador.

O service worker guarda a interface, as fontes e a biblioteca inicial. Imagens coladas por link entram no cache conforme são abertas.

## Biblioteca inicial

Edite `public/seed-exercises.json` direto no repositório. Não existe campo de descrição: a descrição é de cada pessoa, em cada treino, e fica só no aparelho.

Na próxima abertura o app compara o arquivo pelo id de cada exercício. Id novo entra na biblioteca. Nome, categorias e imagem de um id que já existe são atualizados, e o histórico, as cargas e os treinos continuam nesse mesmo id. Um id que saiu do arquivo deixa de aparecer na biblioteca, sem apagar as sessões já registradas.

## Dados

Tudo passa por `src/storage/db.ts` (localStorage, um único JSON). Na tela Dados dá para exportar, importar (substitui o aparelho) ou limpar a base com uma confirmação.

Dois temas escuros: **Brasa** (âmbar, padrão) e **Noite** (lima). O timer de descanso é único para todos os treinos e fica em Dados.
