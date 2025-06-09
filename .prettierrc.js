export default {
  tabWidth: 2,
  useTabs: false,
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: ["<THIRD_PARTY_MODULES>", "^@?\\w", "^[./]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrderGroupNamespaceSpecifiers: true,
  importOrderCaseInsensitive: true,
};
