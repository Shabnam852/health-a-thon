import { useState } from "react";
import { useReferrals } from "../context/ReferralContext.jsx";
import { getHospitalOptions } from "../domain/hospitalChoice.js";
import { ENGLISH_FAMILY_STRINGS, fill, fillParts } from "./familyStrings.js";
import { Badge, Button, Card, Disclosure, Field, Icon, Input, Pictogram } from "./ui/index.js";

// The list a floating patient chooses from. A coordinator sees the same list to record their choice.
// The family screen passes its strings in the family's language; staff get English.
const HospitalChoice = ({ referral, onChoose, onElsewhere, strings: t = ENGLISH_FAMILY_STRINGS, noOptionsText }) => {
  const { facilities, referrals } = useReferrals();
  const [place, setPlace] = useState("");
  const options = getHospitalOptions(referral, facilities, referrals);
  const elsewhere = referral.patientChoice?.elsewhere;

  return (
    <div className="space-y-4">
      {elsewhere && (
        <p className="text-sm text-ink">
          {fillParts(t.planOnRecord, {
            place: <strong key="place">{elsewhere}</strong>,
            id: <strong key="id">{referral.id}</strong>,
          })}
        </p>
      )}

      {options.length === 0 ? (
        <p className="text-sm text-ink">{noOptionsText || t.noOptions}</p>
      ) : (
        <ul className="space-y-3">
          {options.map((hospital) => (
            <Card as="li" key={hospital.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <Pictogram name="hospital" tone="ink" size="sm" bare className="mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-ink break-words">{hospital.name}</p>
                  <p className="text-sm text-ink-muted break-words">{hospital.location}</p>
                  <Badge tone="accent" className="mt-2">
                    {fill(hospital.bedsAvailable === 1 ? t.bedFree : t.bedsFree, { count: hospital.bedsAvailable })}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="primary"
                  aria-label={fill(t.chooseThisAria, { hospital: hospital.name })}
                  onClick={() => onChoose(hospital.name)}
                >
                  {t.chooseThis}
                </Button>
                <Button
                  as="a"
                  href={hospital.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={fill(t.directionsAria, { hospital: hospital.name })}
                >
                  <Icon name="directions" />
                  {t.directions}
                  <span className="sr-only"> {t.newTab}</span>
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <Disclosure title={t.elsewhereTitle} hint={t.elsewhereHint} icon="directions_walk" variant="inline">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onElsewhere(place.trim());
            setPlace("");
          }}
        >
          <Field label={t.placeLabel}>
            <Input value={place} onChange={(e) => setPlace(e.target.value)} />
          </Field>
          <Button type="submit" disabled={!place.trim()}>
            {t.savePlan}
          </Button>
        </form>
      </Disclosure>
    </div>
  );
};

export default HospitalChoice;
