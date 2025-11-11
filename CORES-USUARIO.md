# Sistema de Cores por Tipo de Usuário

Este documento documenta as cores dos banners de perfil para cada tipo de usuário no sistema Aprendiz Plus.

## 🎨 Paleta de Cores

### 👤 Candidato
- **Tom**: Verde Vibrante (Fresh Green)
- **Cor Principal**: `#2ECC71`
- **Cor Escura**: `#27AE60`
- **Gradiente**: `linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)`
- **Descrição**: Verde claro e vibrante que transmite energia, crescimento e novas oportunidades

### 🏢 Empresa
- **Tom**: Verde Esmeralda Profissional (Teal Green)
- **Cor Principal**: `#00A896`
- **Cor Escura**: `#028174`
- **Gradiente**: `linear-gradient(135deg, #00A896 0%, #028174 100%)`
- **Descrição**: Verde-azulado profissional que transmite confiança, estabilidade e corporativismo

### 👨‍💼 Administrador
- **Tom**: Verde Escuro Profissional (Deep Green)
- **Cor Principal**: `#16A085`
- **Cor Escura**: `#117A65`
- **Gradiente**: `linear-gradient(135deg, #16A085 0%, #117A65 100%)`
- **Descrição**: Verde profundo que transmite autoridade, controle e profissionalismo

### 👑 Dono do Sistema (Owner)
- **Tom**: Verde Teal Luxuoso com overlay dourado (Premium Teal)
- **Cor Principal**: `#0D9488`
- **Cor Escura**: `#115E59`
- **Gradiente**: `linear-gradient(135deg, #0D9488 0%, #115E59 100%)`
- **Overlay**: `linear-gradient(45deg, rgba(255, 215, 0, 0.1) 0%, transparent 50%)`
- **Descrição**: Verde escuro sofisticado com toque dourado sutil que transmite exclusividade e poder máximo

## 📁 Arquivos de Estilo

- **Candidato**: `/public/css/perfil-candidato.css`
- **Empresa**: `/public/css/perfil-empresa.css`
- **Admin/Dono**: `/public/css/perfil-admin.css`

## 🎯 Diferenciação Visual

A escolha de diferentes tons de verde mantém a identidade visual da marca enquanto permite que usuários identifiquem rapidamente o tipo de perfil:

1. **Candidato** → Verde mais claro e vibrante (jovem, dinâmico)
2. **Empresa** → Verde esmeralda (profissional, corporativo)
3. **Admin** → Verde profundo (autoridade, gestão)
4. **Dono** → Verde escuro premium com dourado (exclusividade, controle total)

## 💡 Uso no Código

### CSS Variables

```css
/* Candidato */
--candidate-green: #2ECC71;
--candidate-green-dark: #27AE60;

/* Empresa */
--company-green: #00A896;
--company-green-dark: #028174;

/* Admin */
--admin-green: #16A085;
--admin-green-dark: #117A65;

/* Dono */
--owner-green: #0D9488;
--owner-green-dark: #115E59;
```

### Aplicação HTML

Para aplicar a cor especial do dono do sistema, adicione a classe `owner-profile` ao header:

```html
<!-- Admin normal -->
<div class="profile-header">...</div>

<!-- Dono do sistema -->
<div class="profile-header owner-profile">...</div>
```
