# GLA360 Personal – pilna versija (client-only)

Asmeninė 360° lyderystės apklausa, veikianti **be serverio** (tik naršyklėje).
---

## Kas tai?

Šis įrankis leidžia vadovui/-ei gauti struktūruotą grįžtamąjį ryšį iš aplinkinių (vadovo/-ės, kolegų, pavaldinių) ir palyginti jį su savivertinimu. Rezultatas — radarinė diagrama, klasterių lentelė, Top 3 spragos su patarimais ir automatiškai sugeneruotas **90 dienų tobulėjimo planas**.

> ⚠️ Tai **ne oficialus** GLA360 produktas. Struktūra remiasi viešais aprašais:
> [Global Coach Group](https://globalcoachgroup.com/gla360/) · [LEAPING KOI](https://www.leapingkoi.com/gla360.html) · [MGSCC](https://mgscc.net/gla360/)


---

## Pilnas proceso aprašas

### 1 žingsnis — Sukurti vertinimą 

1. Atidarykite [ Apklausa ](https://olemoz1977.github.io/gla360-personal-full/public).
2. Įveskite savo vardą ir projekto pavadinimą.
3. Nurodykite kiek žmonių vertins kiekvienoje grupėje.
4. Spauskite **Sukurti** — gausite unikalų **Assessment ID** ir nuorodas kiekvienam rateriui.
5. **Neišsiųskite nuorodų tiesiogiai.** Perduokite jas per **Anonimiškumo sargą** (žr. žemiau).

---

### 2 žingsnis — Anonimiškumas ir Anonimiškumo sargas

#### Kodėl reikia Anonimiškumo sargo?

Kai rateris užpildo apklausą, jis atsisiunčia `*.json` failą ir turi jį kažkaip perduoti lyderiui. Jei siunčia el. paštu — siuntėjo adresas matomas. Tai pažeidžia anonimiškumą.

**Sprendimas: Anonimiškumo sargas (Anonymity Guardian)**

Tai patikimas žmogus — dažniausiai HR specialistas/-ė, komandos administratorius/-ė ar kitas kolega/-ė — kuris:

- Gauna visus `*.json` failus iš raterių
- Patikrina ar visi atsiuntė (bet nenagrinėja turinio)
- Perduoda failus lyderiui **be jokios informacijos kas ką atsiuntė**

```
Rateris 1 ──┐
Rateris 2 ──┤──→ [Sargas] ──→ Lyderis (gauna tik failus)
Rateris 3 ──┘
```

#### Sargas neturi:
- Atidaryti ar skaityti JSON failų turinio
- Pasakoti lyderiui kas atsiuntė kada
- Saugoti failų ilgiau nei reikia procesui

#### Minimalus raterių skaičius grupėje

| Grupė | Minimalus skaičius | Kodėl |
|---|---|---|
| Boss | 1 | Paprastai neanoniminė grupė |
| Peer | **≥ 3** | Mažiau → identifikuojamas |
| Report | **≥ 3** | Mažiau → identifikuojamas |
| Other | **≥ 2** | Rekomenduojama |
| Self | 1 | Savivertinimas, neanoniminė |

> Jei grupėje mažiau nei rekomenduojama žmonių — geriau tos grupės neįtraukti arba informuoti lyderį, kad anonimiškumas negali būti garantuotas.

#### Komentarų anonimiškumas

Atviri komentarai ataskaitoje rodomi tik su grupės pavadinimu (PEER, BOSS ir t.t.) — be jokio numerio ar identifikatoriaus. Tačiau lyderis gali atpažinti žmogų iš **rašymo stiliaus ar specifinių detalių**. Sargas gali paraginti raterius rašyti bendrai ir vengti unikalių detalių.

---

### 3 žingsnis — Rateriai užpildo apklausą 

1. Rateris atidaro gautą nuorodą naršyklėje.
2. Atsako į 75 klausimus (Likerto skalė 1–5) ir neprivalomą atvirą dalį.
3. Spauskia **Baigti ir atsisiųsti JSON** — failas išsaugomas lokaliai.
4. Failą siunčia **Sargas** (ne lyderiui tiesiogiai).

> 🔒 Duomenys nesiunčiami į jokį serverį. Viskas vyksta naršyklėje. Plačiau apie [Privatumas](https://olemoz1977.github.io/gla360-personal-full/Privacy/PRIVACY.MD)


---

### 4 žingsnis — Ataskaita

1. Anonimiškumo sargas perduoda visus `*.json` failus lyderiui.
2. Lyderis atidaro Ataskaita.
3. Įkelia visus failus (drag & drop arba per mygtuką).
4. Pakoreguoja svorius jei reikia (numatyta: Boss 30%, Peer 30%, Report 30%, Other 10%).
5. Spauskia **Analizuoti**.

**Gausite:**
- 6 pagrindiniai rodikliai (Self vs Others vidurkis, spragos, stiprybės)
- Radarinė diagrama: Self vs Others
- Klasterių vidurkiai su skirtumais
- Top 3 stiprybės (Others > Self) su rekomendacijomis
- Top 3 spragos (Others < Self) su veiksmų pasiūlymais
- Horizontali visų 15 kompetencijų stulpelinė diagrama
- Atviri komentarai pagal grupes

---

### 5 žingsnis — 90 dienų planas 

1. Iš Ataskaita atsisiųskite agreguotą JSON (mygtukas **Atsisiųsti JSON**).
2. Atidarykite 90 d.planas.
3. Įkelkite agreguotą JSON — planas sugeneruojamas automatiškai pagal jūsų Top 3 spragas.
4. Spausdinkite į PDF arba žymimais langeliais sukurtkite sau failą, kurį sugeneravus galite atidaryti ir sukelti planą į savo kalendorių.
   
**Plano struktūra:**
- **Fazė 1 (1–30 d.):** Suvokimas ir diagnozė
- **Fazė 2 (31–60 d.):** Eksperimentai ir praktika
- **Fazė 3 (61–90 d.):** Įtvirtinimas ir peržiūra
- **Savaitinis ritmas** per visą laikotarpį
- **Sėkmės rodikliai** po 90 dienų

---

## Techniniai parametrai

| Parametras | Reikšmė |
|---|---|
| Klasteriai | 5 |
| Kompetencijos | 15 |
| Klausimai | 75 (15 × 5) |
| Skalė | Likerto 1–5 |
| Atsakymų formatas | Key-based JSON (`schema: gla360-personal@2`) |
| Priklausomybės | Chart.js 4.4.4 (tik report.html) |
| Serveris | Nereikalingas |

---

## Privatumas

- Visi duomenys apdorojami **tik naršyklėje** — jokių serverių, jokių duomenų bazių.
- JSON failai saugomi tik vietiniame kompiuteryje kol juos ištrinsite.
- Anonimiškumas priklauso nuo proceso (žr. Anonimiškumo sargas aukščiau).
- Šis įrankis nesaugo, neperduoda ir neanalizuoja jokių asmens duomenų automatiškai.

---

## Svoriai (Others grupė)

Numatytieji svoriai: Boss 30% · Peer 30% · Report 30% · Other 10%

Jei viena grupė nedalyvauja — jos svoris perskirstomas proporcingai tarp likusių automatiškai.

---


## Licencija

MIT. Naudokite laisvai asmeniniais ir komerciniais tikslais. Neminėkite kaip oficialaus GLA360 produkto.
