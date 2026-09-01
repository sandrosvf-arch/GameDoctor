INSERT INTO "help_categories" (
  "id",
  "name",
  "slug",
  "description",
  "order",
  "status",
  "created_at",
  "updated_at"
)
VALUES (
  'help-category-frequently-asked-questions',
  'Dúvidas frequentes',
  'duvidas-frequentes',
  'Respostas para as principais dúvidas sobre aprendizado, acesso e aplicação do curso.',
  1,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "order" = EXCLUDED."order",
  "status" = EXCLUDED."status",
  "updated_at" = CURRENT_TIMESTAMP;

WITH faq_category AS (
  SELECT "id"
  FROM "help_categories"
  WHERE "slug" = 'duvidas-frequentes'
), faq_articles ("id", "title", "slug", "excerpt", "content", "order") AS (
  VALUES
    (
      'help-faq-learning-online',
      'Vou aprender sendo online?',
      'vou-aprender-sendo-online',
      'Sim. Pause, volte e repita cada procedimento enquanto pratica. E conte com comunidade e suporte quando precisar.',
      '<p>Sim. Pause, volte e repita cada procedimento enquanto pratica. E conte com comunidade e suporte quando precisar.</p>',
      1
    ),
    (
      'help-faq-zero-experience',
      'Nunca mexi com eletrônica. Vou conseguir?',
      'nunca-mexi-com-eletronica-vou-conseguir',
      'Sim. Você começa em ferramentas e fundamentos, pratica reparos simples e evolui até diagnóstico, microssolda e BGA.',
      '<p>Sim. Você começa em ferramentas e fundamentos, pratica reparos simples e evolui até diagnóstico, microssolda e BGA.</p>',
      2
    ),
    (
      'help-faq-complete-workbench',
      'Preciso de uma bancada completa?',
      'preciso-de-uma-bancada-completa',
      'Não. Comece com o necessário e evolua a bancada conforme sua prática exigir.',
      '<p>Não. Comece com o necessário e evolua a bancada conforme sua prática exigir.</p>',
      3
    ),
    (
      'help-faq-cannot-learn',
      'E se eu não conseguir aprender?',
      'e-se-eu-nao-conseguir-aprender',
      'Você tem 7 dias para conhecer a formação e acesso anual para rever as aulas quantas vezes precisar.',
      '<p>Você tem 7 dias para conhecer a formação e acesso anual para rever as aulas quantas vezes precisar.</p>',
      4
    ),
    (
      'help-faq-stuck-on-defect',
      'E se eu travar em um defeito e não souber o que fazer?',
      'e-se-eu-travar-em-um-defeito',
      'Use a comunidade e o suporte para compartilhar sintomas, comparar diagnósticos e buscar orientação.',
      '<p>Use a comunidade e o suporte para compartilhar sintomas, comparar diagnósticos e buscar orientação. O objetivo é ensinar você a pensar o diagnóstico, não apenas decorar soluções.</p>',
      5
    ),
    (
      'help-faq-little-study-time',
      'Eu não tenho muito tempo para estudar.',
      'eu-nao-tenho-muito-tempo-para-estudar',
      'O acesso é anual. Você estuda no seu ritmo, em pequenos períodos, e revisa sempre que precisar.',
      '<p>O acesso é anual. Você estuda no seu ritmo, em pequenos períodos, e revisa sempre que precisar.</p>',
      6
    ),
    (
      'help-faq-broken-consoles',
      'Preciso ter videogames quebrados para praticar?',
      'preciso-ter-videogames-quebrados-para-praticar',
      'Não para começar. Primeiro você aprende desmontagem, ferramentas, medições e procedimentos; depois pratica conforme evolui.',
      '<p>Não para começar. Primeiro você aprende desmontagem, ferramentas, medições e procedimentos; depois pratica conforme evolui.</p>',
      7
    ),
    (
      'help-faq-damaging-equipment',
      'Tenho medo de pegar um equipamento e acabar estragando.',
      'tenho-medo-de-acabar-estragando-um-equipamento',
      'A formação começa por desmontagem correta, procedimentos seguros e prática gradual antes dos serviços mais complexos.',
      '<p>A formação começa por desmontagem correta, procedimentos seguros e prática gradual antes dos serviços mais complexos.</p>',
      8
    ),
    (
      'help-faq-getting-customers',
      'Depois que eu aprender, como vou conseguir clientes?',
      'depois-que-eu-aprender-como-vou-conseguir-clientes',
      'Além da técnica, o GameDoctor aborda precificação, atendimento, divulgação, marketing, tráfego pago e estruturação de serviços.',
      '<p>Além da técnica, o GameDoctor aborda precificação, atendimento, divulgação, marketing, tráfego pago e estruturação de serviços.</p>',
      9
    ),
    (
      'help-faq-open-repair-shop',
      'Preciso abrir uma assistência técnica?',
      'preciso-abrir-uma-assistencia-tecnica',
      'Não. Você pode aprender para os próprios reparos, criar renda extra em casa ou estruturar e ampliar uma assistência.',
      '<p>Não. Você pode aprender para os próprios reparos, criar renda extra em casa ou estruturar e ampliar uma assistência.</p>',
      10
    ),
    (
      'help-faq-only-controllers',
      'O curso ensina só controles?',
      'o-curso-ensina-so-controles',
      'Não. A formação inclui PlayStation, Xbox, Nintendo, portáteis, clássicos, placas, HDMI, memórias, NAND/NOR, microssolda, BGA e reballing.',
      '<p>Não. A formação inclui PlayStation, Xbox, Nintendo, portáteis, clássicos, placas, HDMI, memórias, NAND/NOR, microssolda, BGA e reballing.</p>',
      11
    ),
    (
      'help-faq-already-a-technician',
      'E se eu já trabalho com manutenção?',
      'e-se-eu-ja-trabalho-com-manutencao',
      'Use a formação para melhorar diagnósticos, reduzir retrabalho, ampliar serviços e avançar para reparos de maior complexidade.',
      '<p>Use a formação para melhorar diagnósticos, reduzir retrabalho, ampliar serviços e avançar para reparos de maior complexidade.</p>',
      12
    ),
    (
      'help-faq-outdated-content',
      'O conteúdo vai ficar desatualizado?',
      'o-conteudo-vai-ficar-desatualizado',
      'O acesso é anual e inclui as atualizações disponibilizadas na formação conforme surgem novos conteúdos, defeitos e técnicas.',
      '<p>O acesso é anual e inclui as atualizações disponibilizadas na formação conforme surgem novos conteúdos, defeitos e técnicas.</p>',
      13
    ),
    (
      'help-faq-making-money',
      'Vou conseguir ganhar dinheiro com isso?',
      'vou-conseguir-ganhar-dinheiro-com-isso',
      'A manutenção pode se tornar uma fonte de renda, mas resultados variam.',
      '<p>A manutenção pode se tornar uma fonte de renda, mas resultados variam. O curso entrega conhecimento, método e suporte; o resultado depende da aplicação, prática, demanda e divulgação.</p>',
      14
    )
)
INSERT INTO "help_articles" (
  "id",
  "category_id",
  "title",
  "slug",
  "excerpt",
  "content",
  "order",
  "status",
  "created_at",
  "updated_at"
)
SELECT
  faq_articles."id",
  faq_category."id",
  faq_articles."title",
  faq_articles."slug",
  faq_articles."excerpt",
  faq_articles."content",
  faq_articles."order",
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM faq_articles
CROSS JOIN faq_category
ON CONFLICT ("slug") DO UPDATE SET
  "category_id" = EXCLUDED."category_id",
  "title" = EXCLUDED."title",
  "excerpt" = EXCLUDED."excerpt",
  "content" = EXCLUDED."content",
  "order" = EXCLUDED."order",
  "status" = EXCLUDED."status",
  "updated_at" = CURRENT_TIMESTAMP;