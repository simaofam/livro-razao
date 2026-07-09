# Livro-Razão — Finanças Pessoais

App de finanças pessoais estática (HTML/CSS/JS puro), sincronizada entre dispositivos via **Firebase Firestore**, publicável gratuitamente no **GitHub Pages**.

## O que já está feito
- Gastos diários por categoria (com data, nota e valor)
- Categorias personalizáveis, com objetivo mensal por categoria
- Poupanças por categoria e mês
- Dashboard com gráfico por categoria, evolução dos últimos 6 meses e comparação com o mês anterior
- Alertas quando uma categoria ultrapassa o objetivo definido
- Exportação para PDF e Excel do mês selecionado
- Bloqueio da app com palavra-passe (proteção simples ao nível da interface — ver nota de segurança abaixo)
- Sincronização em tempo real entre telemóvel, tablet e PC (qualquer alteração num dispositivo aparece nos outros)

## 1. Criar o projeto Firebase
1. Vai a [console.firebase.google.com](https://console.firebase.google.com) → **Criar projeto** (podes desligar o Google Analytics, não é necessário).
2. Dentro do projeto, clica no ícone `</>` para **adicionar uma app Web**. Dá-lhe um nome (ex: "livro-razao") e regista.
3. A consola mostra um objeto `firebaseConfig` — copia esses valores para `js/firebase-config.js`, substituindo os placeholders.
4. No menu lateral, ativa:
   - **Authentication** → separador "Sign-in method" → ativa **Anónimo**.
   - **Firestore Database** → **Criar base de dados** → modo de produção → escolhe a região mais próxima (ex: `eur3`).

## 2. Definir as regras de segurança do Firestore
No separador **Regras** do Firestore, substitui por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Isto garante que só a tua app (autenticada de forma anónima) consegue ler/escrever dados — sem isto, qualquer pessoa com a tua `apiKey` poderia aceder à base de dados diretamente.

**Nota importante sobre a palavra-passe:** como pediste, a app tem um ecrã de bloqueio com palavra-passe, mas como é uma aplicação estática (sem servidor), essa proteção existe apenas ao nível da interface — alguém com conhecimentos técnicos que aceda diretamente à Firestore (com a tua `apiKey`, que fica visível no código) poderia contornar o ecrã de bloqueio. As regras acima impedem o acesso de estranhos, mas não substituem uma autenticação "a sério". Para reforçar isto no futuro, o passo seguinte seria trocar o login anónimo por **Firebase Authentication com email/palavra-passe**.

## 3. Publicar no GitHub Pages
1. Cria um repositório novo no GitHub (pode ser privado).
2. Envia esta pasta (`finance-app/`) para o repositório:
   ```
   git init
   git add .
   git commit -m "Livro-Razão"
   git branch -M main
   git remote add origin https://github.com/<o-teu-user>/<o-teu-repo>.git
   git push -u origin main
   ```
3. No GitHub: **Settings → Pages → Source** → escolhe o branch `main` e a pasta `/root` → **Save**.
4. Ao fim de 1–2 minutos o site fica disponível em `https://<o-teu-user>.github.io/<o-teu-repo>/`.
5. Abre esse link no telemóvel, tablet e PC — todos vão ler e escrever os mesmos dados na Firestore.

Se o repositório for privado, o GitHub Pages requer o plano GitHub Pro (ou podes usar Pages num repositório público — os dados financeiros continuam seguros porque estão na Firestore, não no repositório).

## 4. Primeira utilização
- Abre o site: como ainda não existe palavra-passe definida na base de dados, vai aparecer o formulário "Primeira utilização" — define a tua palavra-passe aí.
- Nos outros dispositivos vais ver o ecrã normal de "Entrar", pedindo essa mesma palavra-passe.
- Vai a **Configurações** e cria as tuas categorias de gastos e poupanças, com os respetivos objetivos mensais.

## Estrutura de ficheiros
```
finance-app/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js   ← aqui colocas as tuas chaves
│   └── app.js
└── README.md
```

## Possíveis melhorias futuras
- Autenticação real (email + palavra-passe) em vez de login anónimo
- Notificações push quando um limite é ultrapassado
- Editar categorias e registos existentes (atualmente só se apaga e recria)
- Modo escuro
