# GitFlow, protección de ramas y commits firmados

## Ramas

| Rama                 | Propósito                         | Reglas                                                                         |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `prod`               | Producción (solo releases)        | Protegida; PR desde `release/*` o `hotfix/*`; su push dispara el deploy        |
| `develop`            | Integración                       | Protegida; PR desde `feature/*`                                                |
| `feature/LM-n-desc`  | Un issue principal (con subtareas) | Sale de `develop`. Una rama por issue principal, no por subtarea               |
| `release/x.y.z`      | Estabilización del sprint         | Sale de `develop`, se fusiona a `prod` y de vuelta a `develop`                 |
| `hotfix/*`           | Corrección urgente en producción  | Sale de `prod`                                                                 |

> El PRD llama `main` a la rama de producción; en este repositorio se llama `prod`.

## Protección de `prod` y `develop`

- Push directo y push forzado rechazados, también para administradores; no se pueden borrar.
- Todo cambio entra por Pull Request (sin aprobación obligatoria).
- Checks requeridos en verde: `quality`, `e2e`, `docker`, `security / audit`, `security / gitleaks` y `security / codeql`.
- Commits firmados (`Verified`).
- Secret scanning y push protection activos en el repositorio.

## Commits y Pull Requests

- Mensaje: `tipo(ámbito): mensaje [LM-n]`, validado por commitlint en el hook `commit-msg` de Husky.
- El PR usa la plantilla de `.github/pull_request_template.md` e incluye la clave Jira.
- Merge a `develop` con merge commit; sin borrar la rama del issue.

## Firmar commits

GitHub marca `Verified` un commit firmado con una clave registrada en tu cuenta como **clave de firma** (distinta de la clave de autenticación, aunque sea la misma clave).

### Con SSH (recomendado)

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

Después, en GitHub: _Settings → SSH and GPG keys → New SSH key_, tipo **Signing Key**, y pega el contenido de `~/.ssh/id_ed25519.pub`.

### Con GPG

```bash
gpg --full-generate-key           # RSA 4096 o ed25519, con tu correo de GitHub
gpg --list-secret-keys --keyid-format=long
git config --global user.signingkey <ID_DE_LA_CLAVE>
git config --global commit.gpgsign true
gpg --armor --export <ID_DE_LA_CLAVE>   # pégala en Settings → SSH and GPG keys → New GPG key
```

Comprueba con `git log --show-signature -1` y mira el distintivo `Verified` en GitHub.
