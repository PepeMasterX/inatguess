import React, { useEffect, useState } from "react";
import "./App.css"; // Make sure to include this line

function App() {
  const [observation, setObservation] = useState(null);
  const [speciesGuess, setSpeciesGuess] = useState("");
  const [guessLevel, setGuessLevel] = useState("species");
  const [suggestions, setSuggestions] = useState([]);
  const [result, setResult] = useState(null);
  const [taxonTree, setTaxonTree] = useState(null);
  const [score, setScore] = useState(0);

  const [filterInput, setFilterInput] = useState("");
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState(null);

  const levels = [
    { name: "Kingdom", key: "kingdom", points: 100 },
    { name: "Phylum", key: "phylum", points: 200 },
    { name: "Class", key: "class", points: 300 },
    { name: "Order", key: "order", points: 400 },
    { name: "Family", key: "family", points: 600 },
    { name: "Genus", key: "genus", points: 800 },
    { name: "Species", key: "species", points: 1000 },
  ];

  async function fetchObservation() {
    const randomPage = Math.floor(Math.random() * 500) + 1;
    let filterParams = "";

    if (selectedFilter && selectedFilter.id) {
      filterParams = `taxon_id=${selectedFilter.id}`;
    }

    try {
      const res = await fetch(
        `https://api.inaturalist.org/v1/observations?quality_grade=research&has[]=photos&photo_license=CC0,CC-BY&per_page=1&page=${randomPage}&${filterParams}`
      );
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        alert("❌ No observations found for that group. Try another.");
        return;
      }

      const obs = data.results[0];
      setObservation(obs);
      setSpeciesGuess("");
      setGuessLevel("species");
      setResult(null);
      setSuggestions([]);
      setTaxonTree(null);

      if (obs?.taxon?.id) {
        await fetchFullTaxon(obs.taxon.id);
      }

    } catch (error) {
      console.error("Failed to fetch observation:", error);
      alert("⚠️ Error loading observation. Try again.");
    }
  }

  async function fetchFullTaxon(taxonId) {
    const res = await fetch(`https://api.inaturalist.org/v1/taxa/${taxonId}`);
    const data = await res.json();
    setTaxonTree(data.results[0]);
  }

  async function fetchSuggestions(query) {
    if (!query.trim()) return;
    const res = await fetch(`https://api.inaturalist.org/v1/taxa/autocomplete?q=${query}`);
    const data = await res.json();
    const names = data.results.map((t) => t.name);
    setSuggestions(names);
  }

  async function fetchAutocomplete(query) {
    if (!query.trim()) return;
    const res = await fetch(`https://api.inaturalist.org/v1/taxa/autocomplete?q=${query}`);
    const data = await res.json();
    setAutocompleteResults(data.results);
  }

  function getTaxonNameAtLevel(level) {
    if (!taxonTree) return null;
    const ancestor = taxonTree.ancestors?.find((a) => a.rank === level);
    if (taxonTree.rank === level) return taxonTree.name?.toLowerCase();
    return ancestor?.name?.toLowerCase() || null;
  }

  function handleSubmit() {
    if (!observation || !observation.taxon || !taxonTree) return;
    const correctName = getTaxonNameAtLevel(guessLevel);
    const userGuess = speciesGuess.trim().toLowerCase();
    let points = 0;
    let matched = false;

    if (correctName && userGuess === correctName) {
      const levelData = levels.find((l) => l.key === guessLevel);
      points = levelData?.points || 0;
      matched = true;
    }

    if (matched) setScore(score + points);
    else setScore(0);

    setResult({
      correctAnswer: correctName || "(no data)",
      matched,
      guessLevel,
      points,
      observationLink: observation.uri,
      totalScore: matched ? score + points : score,
    });
  }

  useEffect(() => {
    if (!observation) fetchObservation();
  }, []);

  return (
    <div className="app-layout">
      <h1>Specious</h1>
      <p>🏆 Score: {score}</p>

      <div style={{ width: "100%", maxWidth: "500px" }}>
        <input
          type="text"
          placeholder="e.g. Aves, Plantae, Fungi"
          value={filterInput}
          onChange={(e) => {
            setFilterInput(e.target.value);
            fetchAutocomplete(e.target.value);
          }}
        />
        {autocompleteResults.length > 0 && (
          <ul>
            {autocompleteResults.map((taxon, idx) => (
              <li
                key={idx}
                onClick={() => {
                  setSelectedFilter(taxon);
                  setFilterInput(taxon.name);
                  setAutocompleteResults([]);
                }}
              >
                {taxon.name} <span>({taxon.rank})</span>
              </li>
            ))}
          </ul>
        )}
        <button onClick={() => {
          if (!selectedFilter?.id) {
            alert("Please select a valid taxon filter before starting.");
            return;
          }
          fetchObservation();
        }}>
          🔍 Apply & Start
        </button>
      </div>

      {observation && (
        <img
          src={observation.photos[0].url.replace("square", "medium")}
          alt="Observation"
        />
      )}

      {!result && (
        <div style={{ width: "100%", maxWidth: "500px" }}>
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

          <input
            type="text"
            placeholder={`Guess ${guessLevel} name`}
            value={speciesGuess}
            onChange={(e) => {
              setSpeciesGuess(e.target.value);
              fetchSuggestions(e.target.value);
            }}
          />
          {suggestions.length > 0 && (
            <ul>
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => {
                    setSpeciesGuess(suggestion);
                    setSuggestions([]);
                  }}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
          <button onClick={handleSubmit} disabled={!speciesGuess.trim()}>
            Submit Guess
          </button>
        </div>
      )}

      {result && (
        <div className="result-box">
          <p>
            ✅ <strong>Correct {guessLevel}:</strong> {result.correctAnswer}
          </p>
          {result.matched ? (
            <p className="correct">🎯 Correct! (+{result.points} points)</p>
          ) : (
            <p className="wrong">
              ❌ Wrong Guess. You scored {result.totalScore} points in total.
            </p>
          )}
          <a href={result.observationLink} target="_blank" rel="noreferrer">
            🔗 View this observation on iNaturalist
          </a>
          <button onClick={fetchObservation}>Next Round</button>
        </div>
      )}
    </div>
  );
}

export default App;
