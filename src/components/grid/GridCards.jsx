import React from 'react';
import Cards from '../Cards';

export default function GridCards({ data, cols, tableId, onCardClick }) {
    return (
        <Cards
            data={data}
            cols={cols}
            tableId={tableId}
            onCardClick={onCardClick}
        />
    );
}
