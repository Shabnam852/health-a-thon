import { useState } from "react";
import { useReferrals } from "../context/ReferralContext.jsx";
import { getHospitalOptions } from "../domain/hospitalChoice.js";
import { Badge, Button, Card, Field, Icon, Input } from "./ui/index.js";

// The list a floating patient chooses from. A coordinator sees the same list to record their choice.
const HospitalChoice = ({
  referral,
  onChoose,
  onElsewhere,
  noOptionsText = "No suitable hospital has a free bed right now. Your care team will call you.",
}) => {
  const { facilities } = useReferrals();
  const [place, setPlace] = useState("");
  const options = getHospitalOptions(referral, facilities);
  const elsewhere = referral.patientChoice?.elsewhere;

  return (
    <div className="space-y-4">
      {elsewhere && (
        <p className="text-sm text-ink">
          Plan on record: going to <strong>{elsewhere}</strong>. Give case ID <strong>{referral.id}</strong> at
          reception.
        </p>
      )}

      {options.length === 0 ? (
        <p className="text-sm text-ink">{noOptionsText}</p>
      ) : (
        <ul className="space-y-3">
          {options.map((hospital) => (
            <Card as="li" key={hospital.id} className="space-y-3">
              <div className="min-w-0">
                <p className="font-semibold text-ink break-words">{hospital.name}</p>
                <p className="text-sm text-ink-muted break-words">{hospital.location}</p>
                <Badge tone="accent" className="mt-2">
                  {hospital.bedsAvailable} {hospital.bedsAvailable === 1 ? "bed" : "beds"} free
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="primary" onClick={() => onChoose(hospital.name)}>
                  Choose this hospital
                </Button>
                <Button as="a" href={hospital.directionsUrl} target="_blank" rel="noopener noreferrer">
                  <Icon name="directions" />
                  Directions
                  <span className="sr-only"> (opens in a new tab)</span>
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <details className="text-sm text-ink-muted">
        <summary className="cursor-pointer font-semibold text-ink">Going somewhere else?</summary>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onElsewhere(place);
            setPlace("");
          }}
        >
          <Field label="Hospital or place">
            <Input value={place} onChange={(e) => setPlace(e.target.value)} />
          </Field>
          <Button type="submit" disabled={!place.trim()}>
            Save plan
          </Button>
        </form>
      </details>
    </div>
  );
};

export default HospitalChoice;
