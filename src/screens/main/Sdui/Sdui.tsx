//import libraries
import React from 'react';
import profileScreen from '@/sdui/screens/profile.json';
import SduiScreenView, { SduiScreenSchema } from '@/sdui/SduiScreenView';

/**
 * SDUI tab. Layout, content and actions come from `profile.json`.
 */
const Sdui = () => {
    return <SduiScreenView schema={profileScreen as SduiScreenSchema} edges={['top']} />;
};


export default Sdui;
