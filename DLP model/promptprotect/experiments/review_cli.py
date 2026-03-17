from promptprotect.datasets.labeling import load_unlabeled_candidates, save_label

candidates = load_unlabeled_candidates()

print(f"Reviewing {len(candidates)} findings\n")

for record in candidates:
    f = record["finding"]
    features = record["features"]

    print("=" * 80)
    print(f"Category      : {f['category']}")
    print(f"Rule strength : {f['rule_strength']}")
    print(f"Entropy       : {features['entropy']}")
    print(f"value       : {f['value']}")
    print(f"Length        : {features['value_length']}")
    print(f"Char classes  : {features['char_classes']}")
    print(f"Assignment    : {features['is_assignment']}")
    print(f"Key hint      : {features['key_hint_present']}")
    print()

    ctx = record.get("review_context")

    if ctx and ctx.get("snippet"):
        snippet = ctx["snippet"]
        start = ctx["start"]
        end = ctx["end"]

        rel_start = snippet.find(f["value"])
        if rel_start != -1:
            rel_end = rel_start + len(f["value"])
            snippet = (
                snippet[:rel_start]
                + ">>>"
                + snippet[rel_start:rel_end]
                + "<<<"
                + snippet[rel_end:]
            )

        print("Context:")
        print(snippet.replace("\n", "\\n"))
        print()

    decision = input("Label [k=KEEP / s=SUPPRESS / q=quit]: ").strip().lower()

    if decision == "q":
        break
    elif decision == "k":
        save_label(record, "KEEP")
    elif decision == "s":
        save_label(record, "SUPPRESS")
