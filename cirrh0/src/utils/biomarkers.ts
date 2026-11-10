// Plain-language notes on each value Cirrh0 reads. General background written for this demo project;
// a clinician has not reviewed it. Reference ranges differ between labs, so none are given as rules.
export type Biomarker = {
  id: string
  name: string
  unit: string
  measures: string
  high: string
  low: string
  withOthers: string
  usedIn: string
}

export const BIOMARKERS: Biomarker[] = [
  {
    id: 'bilirubin', name: 'Bilirubin', unit: 'mg/dL',
    measures: 'A yellow pigment made when old red blood cells break down. The liver clears it into bile.',
    high: 'The liver may not be clearing it well, bile flow may be blocked, or red cells are breaking down faster than usual. Very high levels cause yellow skin and eyes.',
    low: 'Low values are normal and are not a concern.',
    withOthers: 'Read it with alkaline phosphatase (blockage) and albumin (how well the liver is working).',
    usedIn: 'ALBI',
  },
  {
    id: 'albumin', name: 'Albumin', unit: 'g/dL',
    measures: 'The main protein in blood, made only by the liver. It keeps fluid inside the blood vessels.',
    high: 'Rarely meaningful on its own; dehydration is the usual reason.',
    low: 'The liver may be making less protein, or protein is being lost through the kidneys or gut. Low albumin can come with swollen legs or a swollen abdomen.',
    withOthers: 'Read it with bilirubin. Together they give the ALBI grade of liver function.',
    usedIn: 'ALBI',
  },
  {
    id: 'platelets', name: 'Platelets', unit: '10³/µL',
    measures: 'Small blood cells that help clotting. The liver makes a hormone that helps the bone marrow produce them.',
    high: 'Usually from infection, inflammation or iron deficiency rather than the liver.',
    low: 'In liver scarring the spleen can swell and hold back platelets, so counts often fall as scarring advances. Many other things lower them too.',
    withOthers: 'It is the most influential number in FIB-4 and APRI: the lower it is, the higher both scores.',
    usedIn: 'FIB-4 and APRI',
  },
  {
    id: 'sgot', name: 'AST (SGOT)', unit: 'U/L',
    measures: 'An enzyme found in the liver, and also in muscle and the heart. It leaks into the blood when cells are damaged.',
    high: 'Liver inflammation, alcohol, fatty liver and some medicines raise it. Hard exercise or muscle injury can too.',
    low: 'Low values are normal.',
    withOthers: 'Compare it with ALT. AST higher than ALT is more typical of alcohol-related liver disease and advanced scarring.',
    usedIn: 'FIB-4 and APRI',
  },
  {
    id: 'alt', name: 'ALT (SGPT)', unit: 'U/L',
    measures: 'An enzyme found mostly in the liver. It is the more liver-specific of the two transaminases.',
    high: 'Fatty liver, hepatitis viruses, alcohol and some medicines raise it. It can be normal even when scarring is advanced.',
    low: 'Low values are normal.',
    withOthers: 'A normal ALT does not rule out liver disease, which is why scores combine it with other values.',
    usedIn: 'FIB-4',
  },
  {
    id: 'alk_phos', name: 'Alkaline phosphatase', unit: 'U/L',
    measures: 'An enzyme in the bile ducts and bones. It rises when bile cannot drain.',
    high: 'Blocked or inflamed bile ducts are the usual liver cause. Growing children and some bone conditions also have higher values.',
    low: 'Rarely a concern on its own.',
    withOthers: 'High alkaline phosphatase with high bilirubin points towards a bile-flow problem rather than liver-cell damage.',
    usedIn: 'Shown on your trends; not part of the three scores',
  },
  {
    id: 'copper', name: 'Copper', unit: 'µg/day (urine) or µg/dL',
    measures: 'A trace metal the liver handles and sends into bile.',
    high: 'Can build up when bile flow is poor, or in the inherited condition Wilson disease.',
    low: 'Rarely a liver concern.',
    withOthers: 'Interpreted by a doctor together with the type of test (urine or blood).',
    usedIn: 'The stage model only',
  },
  {
    id: 'cholesterol', name: 'Cholesterol', unit: 'mg/dL',
    measures: 'A fat the liver makes and clears.',
    high: 'Common, and linked to diet, genes and fatty liver. Poor bile flow can also raise it.',
    low: 'Advanced liver disease can lower it as the liver makes less.',
    withOthers: 'Read it with triglycerides.',
    usedIn: 'The stage model only',
  },
  {
    id: 'tryglycerides', name: 'Triglycerides', unit: 'mg/dL',
    measures: 'The main fat in the blood after meals.',
    high: 'Often linked to sugar, alcohol and fatty liver disease.',
    low: 'Not a concern.',
    withOthers: 'High triglycerides with high ALT are a common pattern in fatty liver.',
    usedIn: 'The stage model only',
  },
  {
    id: 'prothrombin', name: 'Prothrombin time', unit: 'seconds',
    measures: 'How long blood takes to clot. The liver makes most clotting proteins.',
    high: 'A longer time means the liver may be making fewer clotting proteins, or blood thinners are in use.',
    low: 'Not a concern.',
    withOthers: 'Doctors often convert it to INR. A prolonged value with low albumin suggests reduced liver function.',
    usedIn: 'The stage model only',
  },
]
