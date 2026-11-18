// Convención del proyecto: tipo(ámbito): mensaje [LM-n]
export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'header-jira-key': ({ header }) => [
          /\[LM-\d+\]$/.test(header),
          'el encabezado debe terminar con la clave de Jira, por ejemplo [LM-5]',
        ],
      },
    },
  ],
  rules: {
    'header-jira-key': [2, 'always'],
  },
};
