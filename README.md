<div align="center">

# 🛒 PDV Unicka Digital

**Sistema de Ponto de Venda local, offline e feito sob medida para uma loja de bairro.**

[![Java](https://img.shields.io/badge/Java-25-orange?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![H2 Database](https://img.shields.io/badge/Banco-H2%20(arquivo%20local)-004488)](https://www.h2database.com/)
[![Frontend](https://img.shields.io/badge/Frontend-HTML%20%2B%20CSS%20%2B%20JS%20puro-yellow?logo=javascript&logoColor=black)](#-stack-técnica)
[![Status](https://img.shields.io/badge/status-em%20produção%20na%20loja-success)](#)

</div>

---

## 💡 Por que este projeto existe

Este é, antes de tudo, um **projeto de estudo com propósito real**.

Meus pais têm uma loja física e usavam caderno e calculadora para controlar o caixa. Eu quis aprender **desenvolvimento back-end com Java/Spring Boot** de verdade — não em um tutorial, mas resolvendo um problema concreto de quem eu conheço. O resultado foi este PDV, que hoje **roda de verdade no balcão da loja**.

O desafio principal não foi só técnico, foi **humano**: meus pais não têm familiaridade com tecnologia. Por isso, cada decisão do sistema foi guiada por três princípios:

- **Simples de usar** — telas diretas, poucos cliques, atalhos de teclado e leitor de código de barras.
- **Não depende da internet** — tudo roda na própria máquina da loja. Sem mensalidade, sem servidor, sem "caiu o sistema".
- **Impossível perder dados** — backup automático todo dia e um banco de dados que nunca apaga o histórico.

> Ou seja: um caso real de engenharia de software onde **usabilidade para o usuário final valeu mais do que sofisticação técnica**.

---

## ✨ Funcionalidades

| Módulo | O que faz |
|---|---|
| 🔐 **Login / Usuários** | Autenticação por sessão com senha criptografada (BCrypt). Dois perfis: **Administrador** (vê tudo) e **Funcionário** (visão reduzida para o balcão). |
| 💰 **Caixa** | Abertura e fechamento de turno, sangrias e suprimentos (retiradas/reforços de dinheiro) com motivo, e **conferência às cegas** no fechamento (o operador conta a gaveta sem ver o valor esperado, evitando "chute"). |
| 🛍️ **Vendas** | Registro de venda com múltiplos itens e formas de pagamento (dinheiro, crédito, débito, PIX), desconto em R$ ou %, item "venda avulsa" para produtos sem cadastro e leitor de código de barras. |
| 📦 **Estoque** | Produtos com código de barras, fornecedor, custo, margem de lucro, localização na loja e **alerta de estoque mínimo**. Inclui uma **lista de compras/pedidos** integrada. |
| 🔄 **Serviços / Recargas** | Registro de serviços de passagem (recarga Jaé, celular, contas) no momento em que acontecem — o fechamento do caixa soma tudo automaticamente. |
| 🎉 **Pegue e Monte (Locações)** | Aluguel de decoração de festas com controle de status (Reservado → Entregue → Devolvido / Cancelado). |
| 👥 **Clientes / 🏭 Fornecedores** | Cadastros básicos com telas dedicadas. |
| 📊 **Relatórios** | Vendas por período, produtos mais vendidos e relatório de locações, com **exportação em PDF** (funciona offline). |
| 📜 **Histórico de Caixa** | Todos os turnos fechados, com resumo detalhado e PDF por turno. |
| 💾 **Backup** | Automático no boot e diariamente às 20h, com retenção de 30 dias. |

---

## 🧱 Stack técnica

- **Linguagem:** Java 25
- **Framework:** Spring Boot 4.1 (Spring Web MVC, Spring Data JPA, Spring Security)
- **Banco de dados:** H2 em modo arquivo (persistente, embarcado — sem instalar nada)
- **ORM:** Hibernate / JPA
- **Frontend:** HTML5, CSS3 e JavaScript puro (sem framework) servidos como conteúdo estático
- **PDF:** [jsPDF](https://github.com/parallax/jsPDF) empacotado localmente (relatórios offline)
- **Empacotamento:** `jpackage` gera um **`.exe` com o Java embutido** — a loja não precisa ter Java instalado
- **Produtividade:** Lombok

### Por que essas escolhas?

- **H2 em arquivo** em vez de MySQL/Postgres: zero configuração, roda numa máquina só, backup é copiar um arquivo. Ideal para uma loja pequena sem infra.
- **JS puro** em vez de React/Angular: menos peso, menos dependências, mais fácil de manter sozinho a longo prazo.
- **`.exe` autocontido:** meus pais dão **dois cliques** e o sistema abre no navegador sozinho. Nenhuma instalação técnica.

---

## 🗂️ Arquitetura

Aplicação **monolítica** que sobe um servidor local em `http://localhost:8080` e abre o navegador automaticamente. O back-end expõe uma API REST (`/api/**`) protegida por sessão, e o front-end é servido como arquivos estáticos.

```
src/main/
├── java/com/UnickaDigital/pdv/
│   ├── PdvApplication.java        # ponto de entrada; abre o navegador ao iniciar
│   ├── SecurityConfig.java        # configuração do Spring Security
│   ├── AuthFilter.java            # exige sessão em /api/** (exceto login)
│   ├── controller/                # endpoints REST (Caixa, Venda, Produto, Serviço...)
│   ├── model/                     # entidades JPA (Venda, Caixa, Produto, Locacao...)
│   ├── repository/                # repositórios Spring Data
│   ├── dto/                       # objetos de transferência
│   └── service/                   # regras de negócio (ex.: BackupService)
└── resources/
    ├── application.properties     # configuração (banco, sessão, JPA)
    └── static/                    # o front-end inteiro (HTML/CSS/JS)
```

> 📁 **Onde ficam os dados:** o banco e os backups **não** vivem no projeto. Ficam na pasta do usuário do Windows, em `~/UnickaPDV/` (`dados/` e `backups/`). Assim, atualizar o sistema é só trocar o programa — os dados da loja permanecem intactos.

> 🏪 **Dados da loja:** o nome, o CNPJ e o endereço que saem no cupom ficam em `unicka-local.properties`, na raiz do projeto e **fora do Git**. O modelo versionado é o `unicka-local.properties.exemplo`.

---

## 🚀 Como rodar (desenvolvimento)

Pré-requisitos: **JDK 25** instalado.

```bash
# na raiz do projeto (onde está o pom.xml)
./mvnw spring-boot:run
```

O sistema sobe em `http://localhost:8080` e abre o navegador sozinho.

### Dados da loja no cupom

O cabeçalho do cupom (nome, CNPJ e endereço) **não fica no código**: vem de um arquivo local que não é versionado. Copie o modelo e preencha com os dados reais:

```bash
cp unicka-local.properties.exemplo unicka-local.properties
```

Sem esse arquivo o sistema inicia normalmente — o cupom apenas sai sem CNPJ e sem endereço.

**Login inicial:** usuário `admin`, senha `admin123` (crie os usuários reais na tela *Usuários* e troque essa senha padrão).

### Gerar o executável de distribuição

```bash
# 1) empacota o .jar
./mvnw package -DskipTests

# 2) gera o app com Java embutido (exemplo)
jpackage --type app-image --name PDV-Unicka \
  --input <pasta-com-o-jar> --main-jar unicka-pdv.jar \
  --icon branding/unicka.ico --app-version 1.x --dest entrega
```

Isso produz uma pasta `PDV-Unicka/` com um `.exe` que roda sem Java instalado — é essa pasta que vai para o computador da loja.

---

## 🔒 Segurança & dados

- Senhas são guardadas com **hash BCrypt** (nunca em texto puro) e nunca são devolvidas nas respostas da API.
- Toda a API exige **sessão autenticada**. O cadastro de usuários e a rotina de backup checam o perfil **ADMIN no próprio servidor**; nas demais telas, a separação entre Administrador e Funcionário é aplicada na interface. Como o sistema roda só na máquina da loja e nunca fica exposto à rede, esse nível atende ao cenário — levar a checagem de perfil para o servidor em todas as rotas é a próxima melhoria da lista.
- Este repositório contém **apenas o código-fonte**. Ficam de fora, via `.gitignore`: os bancos de dados da loja, os artefatos de build (`target/`, `entrega/`) e o `unicka-local.properties`, que guarda os dados reais da loja usados no cupom.

---

## 📌 Situação atual

Sistema **em produção**, rodando no dia a dia da loja, e evoluído em várias versões a partir do feedback real de quem usa (meus pais). Cada melhoria — de atalhos de teclado a conferência de caixa às cegas — nasceu de uma dor observada no balcão.

## 📄 Licença

Distribuído sob a **Licença MIT** — você pode usar, estudar, modificar e compartilhar livremente, mantendo o aviso de copyright. Veja o arquivo [LICENSE](LICENSE) para os detalhes.

© 2026 Jhonatan Brum

---

<div align="center">

*Projeto pessoal e de estudo. Desenvolvido para a loja da família.*

</div>
