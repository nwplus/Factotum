module.exports = {
    'env': {
        'browser': true,
        'commonjs': true,
        'es2021': true
    },
    // 'parser' : '@babel/eslint-parser',
    'extends': 'eslint:recommended',
    'parserOptions': {
        'ecmaVersion': 12,
        // 'requireConfigFile' : false,
    },
    'rules': {
        'indent': [
            'error',
            4,
            { 'SwitchCase' : 1 },
        ],
        'linebreak-style': [
            'error',
            'windows'
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'always'
        ],
        'no-unused-vars': 'off'
    }
};
