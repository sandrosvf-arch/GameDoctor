-- Split multi-sentence FAQ answers into separate <p> tags so the UI can
-- render breathing room between sentences instead of one dense block.
UPDATE "help_articles"
SET "content" = '<p>Use a comunidade e o suporte para compartilhar sintomas, comparar diagnósticos e buscar orientação.</p><p>O objetivo é ensinar você a pensar o diagnóstico, não apenas decorar soluções.</p>',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'help-faq-stuck-on-defect';

UPDATE "help_articles"
SET "content" = '<p>O acesso é anual.</p><p>Você estuda no seu ritmo, em pequenos períodos, e revisa sempre que precisar.</p>',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'help-faq-little-study-time';

UPDATE "help_articles"
SET "content" = '<p>Não para começar.</p><p>Primeiro você aprende desmontagem, ferramentas, medições e procedimentos; depois pratica conforme evolui.</p>',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'help-faq-broken-consoles';

UPDATE "help_articles"
SET "content" = '<p>A manutenção pode se tornar uma fonte de renda, mas resultados variam.</p><p>O curso entrega conhecimento, método e suporte; o resultado depende da aplicação, prática, demanda e divulgação.</p>',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'help-faq-making-money';

UPDATE "help_articles"
SET "content" = '<p>Não.</p><p>Você pode aprender para os próprios reparos, criar renda extra em casa ou estruturar e ampliar uma assistência.</p>',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'help-faq-open-repair-shop';

UPDATE "help_articles"
SET "content" = '<p>Não.</p><p>A formação inclui PlayStation, Xbox, Nintendo, portáteis, clássicos, placas, HDMI, memórias, NAND/NOR, microssolda, BGA e reballing.</p>',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'help-faq-only-controllers';
