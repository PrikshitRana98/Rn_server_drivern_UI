//import libraries
import React from 'react';
import salesScreen from '@/sdui/screens/sales.json';
import SduiScreenView, { SduiScreenSchema } from '@/sdui/SduiScreenView';

/**
 * EOSS sale screen. Fully server driven from `sales.json`, opened from the SDUI profile.
 */
const Sales = () => {
    return <SduiScreenView schema={salesScreen as SduiScreenSchema} />;
};


export default Sales;
