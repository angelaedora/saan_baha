def generate_report(ml_result: dict, references: list[str]) -> str:
    risk = ml_result.get("risk", "unknown")
    probability = ml_result.get("probability", 0.0)
    refs = "; ".join(references[:2]) if references else "No references retrieved"
    return f"Risk level: {risk} (p={probability:.2f}). Evidence: {refs}"
