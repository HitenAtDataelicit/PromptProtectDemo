
const XRegExp = require("xregexp");

module.exports = {
    ethereumPrivateKey: {
        type: "Ethereum Private Key",
        pattern: XRegExp('\\b(?:ethereum[:\\s]*|eth[:\\s]*|private[-\\s]*key[:\\s]*)?0x[a-fA-F0-9]{64}\\b', 'i'),
        description: "Matches 64-character Ethereum private keys prefixed with '0x'.",
        tags: ["Crypto", "Ethereum", "Private Key"],
        priority: 7
    },
    solanaPrivateKey: {
        type: "Solana Private Key",
        pattern: XRegExp('\\b(?:solana[:\\s]*|sol[:\\s]*|private[-\\s]*key[:\\s]*)?[1-9A-HJ-NP-Za-km-z]{88}\\b', 'i'),
        description: "Matches 88-character Solana private keys.",
        tags: ["Crypto", "Solana", "Private Key"],
        priority: 7
    },
    bitcoinPrivateKey: {
        type: "Bitcoin Private Key (WIF)",
        pattern: XRegExp('\\b(?:bitcoin[:\\s]*|btc[:\\s]*|private[-\\s]*key[:\\s]*)?(5[HJK][1-9A-HJ-NP-Za-km-z]{49}|[LK][1-9A-HJ-NP-Za-km-z]{51})\\b', 'i'),
        description: "Matches Bitcoin private keys in Wallet Import Format (WIF).",
        tags: ["Crypto", "Bitcoin", "Private Key"],
        priority: 7
    },
    stellarSecretKey: {
        type: "Stellar Secret Key",
        pattern: XRegExp('\\b(?:xlm[:\\s]*|stellar[:\\s]*|secret[-\\s]*key[:\\s]*)?S[A-Z2-7]{55}\\b', 'i'),
        description: "Matches Stellar secret keys starting with 'S'.",
        tags: ["Crypto", "Stellar", "Secret Key"],
        priority: 7
    },
    rippleSecretKey: {
        type: "Ripple Secret Key",
        pattern: XRegExp('\\b(?:xrp[:\\s]*|ripple[:\\s]*|secret[-\\s]*key[:\\s]*)?s[a-zA-HJ-NP-Z0-9]{28,34}\\b', 'i'),
        description: "Matches Ripple (XRP) secret keys starting with 's'.",
        tags: ["Crypto", "XRP", "Secret Key"],
        priority: 7
    },

    // Medium priority for specific address formats
    ethereum: {
        type: "Ethereum (ETH)",
        pattern: XRegExp('\\b(?:ethereum[:\\s]*|eth[:\\s]*|address[:\\s]*|wallet[:\\s]*|erc20[:\\s]*)?0x[a-fA-F0-9]{40}\\b(?![a-fA-F0-9])', 'i'),
        description: "Matches Ethereum addresses, starting with '0x'.",
        tags: ["Crypto", "Ethereum", "Address"],
        priority: 5
    },
    bitcoin: {
        type: "Bitcoin (BTC)",
        pattern: XRegExp('\\b(?:bitcoin[:\\s]*|btc[:\\s]*|address[:\\s]*|wallet[:\\s]*)?(bc1[a-z0-9]{38,41}|[13][a-km-zA-HJ-NP-Z1-9]{25,33})\\b', 'i'),
        description: "Matches Bitcoin addresses, including 'bc1', '1', and '3' formats.",
        tags: ["Crypto", "Bitcoin", "Address"],
        priority: 5
    },
    litecoin: {
        type: "Litecoin (LTC)",
        pattern: XRegExp('\\b(?:ltc[:\\s]*|litecoin[:\\s]*|address[:\\s]*|wallet[:\\s]*)?(L[a-km-zA-HJ-NP-Z1-9]{25,33}|M[a-km-zA-HJ-NP-Z1-9]{25,33}|ltc1[a-z0-9]{38,59})\\b', 'i'),
        description: "Matches Litecoin addresses, including 'L', 'M', and 'ltc1' formats.",
        tags: ["Crypto", "Litecoin", "Address"],
        priority: 5
    },
    cardano: {
        type: "Cardano (ADA)",
        pattern: XRegExp('\\b(?:ada[:\\s]*|cardano[:\\s]*|address[:\\s]*|wallet[:\\s]*)?(addr1[a-z0-9]{54,100}|Ae2[a-zA-Z0-9]{57})\\b', 'i'),
        description: "Matches Cardano addresses starting with 'addr1' or 'Ae2'.",
        tags: ["Crypto", "Cardano", "Address"],
        priority: 5
    },
    stellar: {
        type: "Stellar (XLM)",
        pattern: XRegExp('\\b(?:xlm[:\\s]*|stellar[:\\s]*|address[:\\s]*|wallet[:\\s]*)?G[A-Z2-7]{55}\\b(?![A-Z2-7])', 'i'),
        description: "Matches Stellar addresses starting with 'G'.",
        tags: ["Crypto", "Stellar", "Address"],
        priority: 5
    },
    xrp: {
        type: "XRP (Ripple)",
        pattern: XRegExp('\\b(?:xrp[:\\s]*|ripple[:\\s]*|address[:\\s]*|wallet[:\\s]*)?r[r4-9][a-hj-np-zA-HJ-NP-Z0-9]{24,33}\\b', 'i'),
        description: "Matches XRP (Ripple) addresses starting with 'r'.",
        tags: ["Crypto", "XRP", "Address"],
        priority: 5
    },
    dogecoin: {
        type: "Dogecoin (DOGE)",
        pattern: XRegExp('\\b(?:doge[:\\s]*|dogecoin[:\\s]*|address[:\\s]*|wallet[:\\s]*)?(D[a-km-zA-HJ-NP-Z1-9]{33})\\b', 'i'),
        description: "Matches Dogecoin addresses starting with 'D'.",
        tags: ["Crypto", "Dogecoin", "Address"],
        priority: 5
    },
    avalanche: {
        type: "Avalanche (AVAX)",
        pattern: XRegExp('\\b(?:avax[:\\s]*|avalanche[:\\s]*|address[:\\s]*|wallet[:\\s]*)?(X|P|C)-avax1[a-z0-9]{38,57}\\b', 'i'),
        description: "Matches Avalanche addresses prefixed with 'X-', 'P-', or 'C-avax1'.",
        tags: ["Crypto", "Avalanche", "Address"],
        priority: 5
    },
    polkadot: {
        type: "Polkadot (DOT)",
        pattern: XRegExp('\\b(?:dot[:\\s]*|polkadot[:\\s]*|address[:\\s]*|wallet[:\\s]*)?(1[46]?[a-km-zA-HJ-NP-Z1-9]{46})\\b', 'i'),
        description: "Matches Polkadot addresses with specific format.",
        tags: ["Crypto", "Polkadot", "Address"],
        priority: 5
    },

    // Lower priority for more generic-looking addresses
    solana: {
        type: "Solana (SOL)",
        pattern: XRegExp('\\b(?:sol[:\\s]*|solana[:\\s]*|address[:\\s]*|wallet[:\\s]*)?[1-9A-HJ-NP-Za-km-z]{43,44}\\b', 'i'),
        description: "Matches Solana addresses with 43-44 characters.",
        tags: ["Crypto", "Solana", "Address"],
        priority: 4
    }
};