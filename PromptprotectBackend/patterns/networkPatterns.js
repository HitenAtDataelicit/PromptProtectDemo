const XRegExp = require("xregexp");

module.exports = {
    certsAndKeys: {
        type: "Certificates and Private Keys",
        pattern: XRegExp('-----BEGIN\\s+(CERTIFICATE|PRIVATE\\s+KEY|RSA\\s+PRIVATE\\s+KEY|EC\\s+PRIVATE\\s+KEY)-----[\\r\\n]+([A-Za-z0-9+/=\\r\\n]+)[\\r\\n]+-----END\\s+\\1-----', 'gi'),
        description: "Matches PEM-formatted certificates and private keys.",
        tags: ["Security", "Certificate", "Private Key"],
        priority: 10
    },
    sshRSAKey: {
        type: "SSH RSA Key",
        pattern: XRegExp('\\bssh-rsa\\s+[A-Za-z0-9+/=]{20,512}(?:\\s+[\\w@.-]+)?\\b'),
        description: "Matches SSH keys using the RSA algorithm.",
        tags: ["Security", "SSH", "Key"],
        priority: 9
    },
    sshDSSKey: {
        type: "SSH DSS Key",
        pattern: XRegExp('\\bssh-dss\\s+[A-Za-z0-9+/=]{20,512}(?:\\s+[\\w@.-]+)?\\b'),
        description: "Matches SSH keys using the DSS algorithm.",
        tags: ["Security", "SSH", "Key"],
        priority: 9
    },
    sshECDSAKey: {
        type: "SSH ECDSA Key",
        pattern: XRegExp('\\becdsa-sha2-nistp256\\s+[A-Za-z0-9+/=]{20,512}(?:\\s+[\\w@.-]+)?\\b'),
        description: "Matches SSH keys using the ECDSA algorithm.",
        tags: ["Security", "SSH", "Key"],
        priority: 9
    },
    sshED25519Key: {
        type: "SSH ED25519 Key",
        pattern: XRegExp('\\bssh-ed25519\\s+[A-Za-z0-9+/=]{20,512}(?:\\s+[\\w@.-]+)?\\b'),
        description: "Matches SSH keys using the ED25519 algorithm.",
        tags: ["Security", "SSH", "Key"],
        priority: 9
    },
    accessControlLists: {
        type: "Access Control Lists (ACLs)",
        pattern: XRegExp('\\bconfig\\s+firewall\\s+acl[6]?\\s+edit\\s+\\d+\\s+set\\s+interface\\s+"[^"]+"\\s+set\\s+srcaddr\\s+"[^"]+"\\s+set\\s+dstaddr\\s+"[^"]+"\\s+set\\s+service\\s+"[^"]+"\\s+next\\s+end\\b'),
        description: "Matches specific firewall ACL configuration formats.",
        tags: ["Network", "Security", "ACL"],
        priority: 8
    },
    ipv6Address: {
        type: "IPv6 Address",
        pattern: XRegExp('\\b((?:[0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})\\b(?![:-\\w])'),
        description: "Matches common formats for IPv6 addresses.",
        tags: ["Network", "IP Address", "IPv6"],
        priority: 7
    },
    macAddress: {
        type: "MAC Address",
        pattern: XRegExp('\\b([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\\b(?![:-\\w])'),
        description: "Matches hardware MAC addresses.",
        tags: ["Network", "MAC Address", "Device"],
        priority: 7
    },
    localFilePath: {
        type: "Local File Path",
        pattern: XRegExp('(?:file://|/?home/|/?Users/|[A-Za-z]:\\\\)[^\\s:"<>|?*]+', 'i'),
        description: "Matches local file paths for Windows, macOS, and Linux.",
        tags: ["System", "File Path"],
        priority: 6
    },
    subnetInfo: {
        type: "Subnet Information",
        pattern: XRegExp('\\b(?:Subnet|Netmask|CIDR|Subnet Info|Network)\\s*[:# ]\\s*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\/(3[0-2]|[1-2]?[0-9])\\b(?![\\d.-])', 'i'),
        description: "Matches labeled subnet masks in CIDR notation.",
        tags: ["Network", "Subnet", "CIDR"],
        priority: 6
    },
    deviceSerials: {
        type: "Device Serial Numbers",
        pattern: XRegExp('\\b(?:Serial(?:\\s*Number)?|Serial#|SN|S\\/N|SER#|Device Serial(?:\\s*Number)?)\\s*[#: ]\\s*[A-Z0-9-]{8,20}\\b', 'i'),
        description: "Matches labeled device serial numbers.",
        tags: ["Device", "Serial Number", "Asset"],
        priority: 6
    },
    assetTags: {
        type: "Asset Tags",
        pattern: XRegExp('\\b(?:Asset Tag|Asset#|AssetTag|ATAG|Asset)\\s*[#: ]\\s*[A-Z0-9]{8,16}\\b', 'i'),
        description: "Matches labeled asset tags for devices.",
        tags: ["Asset", "Device", "Tag"],
        priority: 6
    },
    deviceHostnames: {
        type: "Device Hostnames",
        pattern: XRegExp('\\b(?:Hostname|Device Hostname|Host|DeviceHostname|HOSTNAME#|Device Hostname#|Host#)\\s*[#: ]\\s*(?!-)[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\\.[a-zA-Z]{2,}){1,}\\b', 'i'),
        description: "Matches labeled device hostnames.",
        tags: ["Network", "Device", "Hostname"],
        priority: 5
    },
    internalIP: {
        type: "Internal IP Address (IPv4)",
        pattern: XRegExp('\\b(10|192\\.168|172\\.(1[6-9]|2[0-9]|3[0-1]))\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b'),
        description: "Matches IPv4 addresses in private network ranges.",
        tags: ["Network", "IP Address", "Internal"],
        priority: 4
    },
    externalIP: {
        type: "External IP Address (IPv4)",
        pattern: XRegExp('(?<!\\d)((?!10|192\\.168|172\\.(1[6-9]|2[0-9]|3[0-1]))(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(?!\\d)'),
        description: "Matches public-facing IPv4 addresses.",
        tags: ["Network", "IP Address", "External"],
        priority: 3
    },
    packetCaptures: {
        type: "Packet Captures (PCAP files)",
        pattern: XRegExp('\\b([\\w-]+)\\.(pcap|pcapng)\\b', 'i'),
        description: "Matches PCAP file extensions.",
        tags: ["Network", "Packet Capture", "File"],
        priority: 2
    },
    networkMetadata: {
        type: "Network Metadata (timestamps, size of data transfers, etc.)",
        pattern: XRegExp('\\b(?:Timestamp|Date|Time|Size|Data Transfer)\\s*[:# ]\\s*(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}|\\d{2}:\\d{2}:\\d{2}|\\d+\\s+(bytes|KB|MB|GB|TB))\\b', 'i'),
        description: "Matches labeled network metadata like timestamps and data sizes.",
        tags: ["Network", "Metadata", "Data Transfer"],
        priority: 1
    },
    networkLogs: {
        type: "Logs of Network Traffic",
        pattern: XRegExp('\\b(packet|bytes|ip|source|destination|protocol|length|flags|ttl|seq|ack|tcp|udp|transmit|receive|data|latency|throughput)\\s+(log|capture|traffic)\\b', 'i'),
        description: "Matches common keywords found in network traffic logs.",
        tags: ["Network", "Traffic", "Log"],
        priority: 1
    },
    firewallRules: {
        type: "Firewall Rules and Policies",
        pattern: XRegExp('\\b(allow|deny|reject|accept|drop|block|permit|iptable|firewall-rule|fw-rule|acl-entry)\\s+(rule|policy|config|setting)\\b', 'i'),
        description: "Matches common keywords related to firewall rules.",
        tags: ["Network", "Security", "Firewall"],
        priority: 1
    }
};