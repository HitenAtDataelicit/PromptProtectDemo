import spacy
nlp = spacy.load("en_core_web_sm")

doc = nlp("i am from USA, Manhatton")

for ent in doc.ents:
    if ent.label_ == "GPE":
        print(ent.text)
