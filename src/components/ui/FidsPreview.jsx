import React from 'react';
import { Plane, ArrowRight } from 'lucide-react';

const FidsPreview = ({ stationId, sn }) => {
    // Simulate flight data based on station ID or random
    const flightNo = `VN${Math.floor(Math.random() * 899) + 100}`;
    const destination = ['Hanoi', 'Da Nang', 'Ho Chi Minh', 'Singapore', 'Tokyo', 'Seoul'][Math.floor(Math.random() * 6)];
    const time = '12:30';
    const status = 'Boarding';

    return (
        <div className="w-full aspect-video bg-black text-white p-4 relative overflow-hidden flex flex-col font-sans">
            {/* Screen Bezel Simulation */}
            <div className="absolute top-2 right-2 text-[10px] text-gray-600 font-mono">{sn}</div>

            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <Plane size={18} className="transform -rotate-45" />
                    </div>
                    <span className="font-bold text-lg tracking-wider">AIRLINES</span>
                </div>
                <div className="text-xl font-bold text-yellow-500">{time}</div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center items-center gap-4">
                <div className="text-6xl font-black tracking-tight">{destination.toUpperCase()}</div>
                <div className="flex items-center gap-4 text-2xl text-gray-300">
                    <span>{flightNo}</span>
                    <ArrowRight size={24} />
                    <span>Gate {stationId.split('-')[1]}</span>
                </div>
                <div className="mt-6 px-6 py-2 bg-green-600 text-white font-bold rounded animate-pulse">
                    {status.toUpperCase()}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-2 border-t border-gray-800 flex justify-between text-xs text-gray-500">
                <span>Temp: 24°C</span>
                <span>Please have your boarding pass ready.</span>
            </div>
        </div>
    );
};

export default FidsPreview;
