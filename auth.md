# Autenticação do software

Use o endpoint abaixo para autenticar o usuário no software externo.

## Endpoint

`POST https://gamedoctor.vercel.app/api/auth/software`

Envie JSON com o e-mail e a senha:

```json
{
  "email": "aluno@exemplo.com",
  "password": "senha-do-aluno"
}
```

Também envie o cabeçalho:

```text
Content-Type: application/json
```

## Sucesso

Status HTTP: `200`

```json
{
  "success": true,
  "status": "authenticated",
  "user": {
    "id": "cm...",
    "name": "Nome do aluno",
    "email": "aluno@exemplo.com",
    "role": "STUDENT",
    "accountStatus": "ACTIVE"
  },
  "access": {
    "active": true,
    "permissions": [
      {
        "id": "cm...",
        "type": "TIMED",
        "startsAt": "2026-09-03T12:00:00.000Z",
        "expiresAt": "2027-09-03T12:00:00.000Z",
        "plan": {
          "id": "cm...",
          "name": "Plano Anual",
          "slug": "plano-anual"
        },
        "course": null
      }
    ]
  }
}
```

`access.active` indica se existe pelo menos um acesso válido. A lista `permissions` pode conter acessos de plano e de curso. Quando o acesso for de plano, `course` será `null`; quando for direto para um curso, `plan` poderá ser `null`.

As datas estão em formato ISO 8601 UTC. O software deve considerar o acesso liberado somente quando `access.active` for `true`.

## Erros

### Credenciais inválidas

Status HTTP: `401`

```json
{
  "success": false,
  "status": "invalid_credentials",
  "error": "E-mail ou senha inválidos."
}
```

O mesmo retorno é usado quando o e-mail não existe. Não tente diferenciar esses casos.

### Conta bloqueada

Status HTTP: `403`

```json
{
  "success": false,
  "status": "blocked",
  "error": "A conta não está disponível para acesso."
}
```

### Muitas tentativas

Status HTTP: `429`. Aguarde e tente novamente depois do tempo indicado pelo cabeçalho `Retry-After`.

```json
{
  "success": false,
  "status": "rate_limited",
  "error": "Muitas tentativas. Aguarde alguns minutos e tente novamente."
}
```

## Limites e segurança

- Limite de `10` tentativas por IP a cada `10` minutos.
- Limite de `5` tentativas por e-mail a cada `10` minutos.
- Nunca registre ou armazene a senha.
- Use HTTPS e não coloque a senha na URL, em logs ou em parâmetros de consulta.
- O endpoint autentica a conta, mas não cria uma sessão persistente para o software. Faça uma nova autenticação quando necessário e armazene no software apenas o mínimo necessário.
- O limite é aplicado por instância do servidor. Para uma integração de grande volume, combine este endpoint com um limite no servidor do software e solicite uma chave de integração dedicada.
