import React, { useEffect, useState } from "react";
import "./App.css"; // Nuevo archivo para estilos globales

function App() {
  const [observation, setObservation] = useState(null);
  const [speciesGuess, setSpeciesGuess] = useState("");
  const [guessLevel, setGuessLevel] = useState("species");
  const [suggestions, setSuggestions] = useState([]);
  const [result, setResult] = useState(null);
  const [taxonTree, setTaxonTree] = useState(null);
  const [score, setScore] = useState(0);

  const levels = [
    { name: "Kingdom", key: "kingdom", points: 100 },
    { name: "Phylum", key: "phylum", points: 200 },
    { name: "Class", key: "class", points: 300 },
    { name: "Order", key: "order", points: 400 },
    { name: "Family", key: "family", points: 600 },
    { name: "Genus", key: "genus", points: 800 },
    { name: "Species", key: "species", points: 1000 },
  ];

  useEffect(() => {
    fetchObservation();
  }, []);

  async function fetchObservation() {
    const randomPage = Math.floor(Math.random() * 500) + 1;
    const res = await fetch(
      `https://api.inaturalist.org/v1/observations?quality_grade=research&has[]=photos&photo_license=CC0,CC-BY&per_page=1&page=${randomPage}`
    );
    const data = await res.json();
    const obs = data.results[0];
    setObservation(obs);
    setSpeciesGuess("");
    setGuessLevel("species");
    setResult(null);
    setSuggestions([]);
    setTaxonTree(null);

    if (obs && obs.taxon) {
      await fetchFullTaxon(obs.taxon.id);
    }
  }

  async function fetchFullTaxon(taxonId) {
    const res = await fetch(
      `https://api.inaturalist.org/v1/taxa/${taxonId}`
    );
    const data = await res.json();
    setTaxonTree(data.results[0]);
  }

  async function fetchSuggestions(query) {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const res = await fetch(
      `https://api.inaturalist.org/v1/taxa/autocomplete?q=${query}`
    );
    const data = await res.json();
    setSuggestions(data.results.map((taxon) => taxon.name));
  }

  function getTaxonNameAtLevel(level) {
    if (!taxonTree) return null;
    const ancestor = taxonTree.ancestors?.find((a) => a.rank === level);
    return taxonTree.rank === level
      ? taxonTree.name?.toLowerCase()
      : ancestor?.name?.toLowerCase() || null;
  }

  function handleSubmit() {
    if (!observation || !observation.taxon || !taxonTree) return;
    const correctName = getTaxonNameAtLevel(guessLevel);
    const userGuess = speciesGuess.trim().toLowerCase();

    const levelData = levels.find((l) => l.key === guessLevel);
    const matched = correctName === userGuess;
    const points = matched ? levelData?.points || 0 : 0;

    setScore(matched ? score + points : 0);
    setResult({
      correctAnswer: correctName || "(no data)",
      matched,
      guessLevel,
      points,
      observationLink: observation.uri,
    });
  }

  if (!observation) return <div className="loading">Loading observation...</div>;

  return (
    <div className="app-container">
      <h1 className="title">🌿 Taxaddivinare</h1>
      <p className="score">🏆 Score: {score}</p>

      <img
        src={observation.photos[0].url.replace("square", "medium")}
        alt="Observation"
        className="observation-image"
      />

      {!result && (
        <>
          <div className="form-group">
            <label>Select taxon level to guess:</label>
            <select
              value={guessLevel}
              onChange={(e) => setGuessLevel(e.target.value)}
            >
              {levels.map((level) => (
                <option key={level.key} value={level.key}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder={`Guess ${guessLevel} name`}
            value={speciesGuess}
            onChange={(e) => {
              setSpeciesGuess(e.target.value);
              fetchSuggestions(e.target.value);
            }}
            className="guess-input"
          />

          {suggestions.length > 0 && (
            <ul className="suggestion-list">
              {suggestions.map((s, i) => (
                <li key={i} onClick={() => {
                  setSpeciesGuess(s);
                  setSuggestions([]);
                }}>
                  {s}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handleSubmit}
            disabled={speciesGuess.trim() === ""}
            className="submit-button"
          >
            Submit Guess
          </button>
        </>
      )}

      {result && (
        <div className="result-box">
          <p>
            ✅ <strong>Correct {levels.find(l => l.key === guessLevel)?.name}:</strong> {result.correctAnswer}
          </p>
          {result.matched ? (
            <p className="correct">🎯 Correct! (+{result.points} points)</p>
          ) : (
            <p className="wrong">❌ Wrong Guess. Score reset to 0.</p>
          )}
          <a href={result.observationLink} target="_blank" rel="noopener noreferrer">
            🔗 View this observation on iNaturalist
          </a>
          <button onClick={fetchObservation} className="next-button">
            Next Round
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
