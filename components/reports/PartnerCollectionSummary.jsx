import { formatCurrency } from "@/utils/formatters"

export function PartnerCollectionSummary({ partners, total }){
    if(!partners || partners.length === 0) return null

    return (
        <div>
            {partners.map((p, i) => {
                const pct = total > 0 ? Math.round((p.collected /total) * 100): 0
                return (
                    <div>
                        <div>
                            <div>
                                {/* partner initials */}
                                <div>
                                    {p.name.charAt(0).toUpperCase()}
                                </div>

                                <span>
                                    {p.name}
                                </span>
                                <span>
                                    {p.payment_count} paument{p.payment_count !== 1 ? 's': ''}
                                </span>
                            </div>
                            <span>
                                {formatCurrency(p.collected)}
                            </span>
                        </div>
                        <div>
                            <div>
                                
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}