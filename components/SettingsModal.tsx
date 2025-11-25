
import React, { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [theme, setTheme] = useState('Auto');

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center animate-in fade-in duration-200"
        onClick={onClose}
    >
      <div 
        className="bg-[#09090b] border border-zinc-800 rounded-xl w-[400px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - Unified with CreditModal (No Border, p-6) */}
        <div className="p-6 flex items-center justify-between shrink-0">
          <span className="text-lg font-medium text-white tracking-tight">Einstellungen</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-8 no-scrollbar">
          
          {/* Account */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Account</h3>
            <div className="flex items-center gap-3 mb-3 px-1">
                <span className="text-sm text-zinc-300 font-medium">hello@expose.ae</span>
                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-bold rounded uppercase tracking-wider border border-red-500/20">Admin</span>
            </div>
            <div className="space-y-2">
                <button className="w-full py-3 px-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700 hover:text-white transition-all text-left flex items-center justify-between group">
                    Admin-Panel
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                </button>
                <button className="w-full py-3 px-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700 hover:text-white transition-all text-left">
                    Abmelden
                </button>
                <button className="w-full py-3 px-4 bg-zinc-900/20 border border-zinc-900 rounded-lg text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-900/10 hover:border-red-900/30 transition-all text-left">
                    Konto löschen
                </button>
            </div>
          </section>

          {/* Design */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Design</h3>
            <div className="grid grid-cols-3 p-1 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                {['Hell', 'Dunkel', 'Auto'].map((t) => (
                     <button 
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${theme === t ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>
          </section>

          {/* Feedback */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Feedback</h3>
            <button className="w-full py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all">
                Feedback senden
            </button>
          </section>

           <div className="h-px bg-zinc-900/50" />

           {/* Branding */}
           <div className="pt-4 pb-2 flex flex-col items-center justify-center space-y-6">
               <div className="flex flex-col items-center gap-4">
                   {/* Custom SVG Logo */}
                   <div className="w-24 h-24 flex items-center justify-center">
                       <svg viewBox="0 0 1000 1000" className="w-full h-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>exposé</title>
                            <path d="M270.555 883.379C258.445 892.428 245.132 896.953 230.613 896.953C220.262 896.953 210.984 894.674 202.781 890.117C194.578 885.56 188.1 879.342 183.348 871.465C178.595 863.587 176.219 854.701 176.219 844.805C176.219 835.365 178.4 826.934 182.762 819.512C187.124 812.025 193.081 806.133 200.633 801.836C208.185 797.539 216.746 795.391 226.316 795.391C236.212 795.391 244.904 797.734 252.391 802.422C259.943 807.109 265.802 813.652 269.969 822.051C274.201 830.384 276.316 840.052 276.316 851.055V854.18H197.898C199.07 859.258 201.251 863.717 204.441 867.559C207.697 871.335 211.733 874.297 216.551 876.445C221.434 878.529 226.902 879.57 232.957 879.57C243.764 879.57 253.693 876.055 262.742 869.023L270.555 883.379ZM197.02 840.312H257.664C257.013 834.844 255.32 830.091 252.586 826.055C249.852 821.953 246.303 818.763 241.941 816.484C237.645 814.141 232.794 812.969 227.391 812.969C221.922 812.969 217.007 814.141 212.645 816.484C208.283 818.763 204.734 821.953 202 826.055C199.331 830.156 197.671 834.909 197.02 840.312ZM307.957 895H281.688L323.484 844.707L284.52 797.344H311.277L336.863 829.961L362.059 797.344H388.328L349.949 844.316L391.746 895H364.891L336.668 858.965L307.957 895ZM427.293 943.828H407.273V797.344H424.949L426.023 811.309C430.451 806.361 435.757 802.487 441.941 799.688C448.191 796.823 455.027 795.391 462.449 795.391C471.824 795.391 480.19 797.604 487.547 802.031C494.969 806.458 500.796 812.513 505.027 820.195C509.324 827.812 511.473 836.471 511.473 846.172C511.473 855.807 509.324 864.466 505.027 872.148C500.796 879.831 494.969 885.885 487.547 890.312C480.19 894.74 471.824 896.953 462.449 896.953C455.418 896.953 448.908 895.684 442.918 893.145C436.928 890.605 431.72 887.057 427.293 882.5V943.828ZM459.227 878.789C465.411 878.789 470.88 877.389 475.633 874.59C480.385 871.79 484.096 867.949 486.766 863.066C489.5 858.118 490.867 852.454 490.867 846.074C490.867 839.694 489.5 834.062 486.766 829.18C484.096 824.232 480.385 820.358 475.633 817.559C470.88 814.759 465.444 813.359 459.324 813.359C453.53 813.359 448.289 814.661 443.602 817.266C438.979 819.805 435.203 823.32 432.273 827.812C429.409 832.305 427.749 837.415 427.293 843.145V849.199C427.749 854.928 429.376 860.039 432.176 864.531C435.04 868.958 438.784 872.441 443.406 874.98C448.094 877.52 453.367 878.789 459.227 878.789ZM576.805 896.953C567.039 896.953 558.25 894.74 550.438 890.312C542.625 885.885 536.473 879.863 531.98 872.246C527.488 864.564 525.242 855.872 525.242 846.172C525.242 836.536 527.488 827.91 531.98 820.293C536.473 812.611 542.625 806.556 550.438 802.129C558.25 797.637 567.039 795.391 576.805 795.391C586.635 795.391 595.424 797.637 603.172 802.129C610.919 806.556 617.007 812.611 621.434 820.293C625.926 827.91 628.172 836.536 628.172 846.172C628.172 855.872 625.926 864.564 621.434 872.246C617.007 879.863 610.919 885.885 603.172 890.312C595.424 894.74 586.635 896.953 576.805 896.953ZM576.707 878.984C582.632 878.984 587.905 877.552 592.527 874.688C597.215 871.758 600.893 867.852 603.562 862.969C606.297 858.021 607.664 852.422 607.664 846.172C607.664 839.922 606.297 834.355 603.562 829.473C600.893 824.525 597.215 820.618 592.527 817.754C587.905 814.824 582.632 813.359 576.707 813.359C570.848 813.359 565.574 814.824 560.887 817.754C556.199 820.618 552.488 824.525 549.754 829.473C547.085 834.355 545.75 839.922 545.75 846.172C545.75 852.422 547.085 858.021 549.754 862.969C552.488 867.852 556.199 871.758 560.887 874.688C565.574 877.552 570.848 878.984 576.707 878.984ZM640.234 886.504L645.117 868.535C647.331 870.749 649.967 872.702 653.027 874.395C656.152 876.087 659.44 877.422 662.891 878.398C666.406 879.31 669.857 879.766 673.242 879.766C678.581 879.766 682.878 878.626 686.133 876.348C689.388 874.069 691.016 871.042 691.016 867.266C691.016 864.466 690.104 862.155 688.281 860.332C686.523 858.444 684.147 856.816 681.152 855.449C678.223 854.082 675.065 852.747 671.68 851.445C667.318 849.818 662.956 847.93 658.594 845.781C654.297 843.633 650.684 840.768 647.754 837.188C644.824 833.607 643.359 828.887 643.359 823.027C643.359 817.428 644.792 812.578 647.656 808.477C650.521 804.31 654.525 801.087 659.668 798.809C664.811 796.53 670.736 795.391 677.441 795.391C687.858 795.391 698.177 797.995 708.398 803.203L702.539 820.293C700.456 818.796 697.982 817.461 695.117 816.289C692.253 815.117 689.323 814.206 686.328 813.555C683.333 812.839 680.566 812.48 678.027 812.48C673.796 812.48 670.378 813.424 667.773 815.312C665.234 817.201 663.965 819.74 663.965 822.93C663.965 824.883 664.583 826.673 665.82 828.301C667.057 829.863 669.01 831.426 671.68 832.988C674.414 834.486 678.092 836.178 682.715 838.066C687.142 839.824 691.569 841.842 695.996 844.121C700.423 846.4 704.102 849.362 707.031 853.008C710.026 856.654 711.523 861.439 711.523 867.363C711.523 873.223 709.961 878.398 706.836 882.891C703.711 887.318 699.349 890.768 693.75 893.242C688.216 895.716 681.771 896.953 674.414 896.953C662.24 896.953 650.846 893.47 640.234 886.504ZM817.922 883.379C805.812 892.428 792.499 896.953 777.98 896.953C767.629 896.953 758.352 894.674 750.148 890.117C741.945 885.56 735.467 879.342 730.715 871.465C725.962 863.587 723.586 854.701 723.586 844.805C723.586 835.365 725.767 826.934 730.129 819.512C734.491 812.025 740.448 806.133 748 801.836C755.552 797.539 764.113 795.391 773.684 795.391C783.579 795.391 792.271 797.734 799.758 802.422C807.31 807.109 813.169 813.652 817.336 822.051C821.568 830.384 823.684 840.052 823.684 851.055V854.18H745.266C746.438 859.258 748.618 863.717 751.809 867.559C755.064 871.335 759.1 874.297 763.918 876.445C768.801 878.529 774.27 879.57 780.324 879.57C791.132 879.57 801.06 876.055 810.109 869.023L817.922 883.379ZM744.387 840.312H805.031C804.38 834.844 802.688 830.091 799.953 826.055C797.219 821.953 793.671 818.763 789.309 816.484C785.012 814.141 780.161 812.969 774.758 812.969C769.289 812.969 764.374 814.141 760.012 816.484C755.65 818.763 752.102 821.953 749.367 826.055C746.698 830.156 745.038 834.909 744.387 840.312ZM779.055 781.23H764.699L779.543 748.516H798.195L779.055 781.23Z" fill="#E7E7E7"/>
                            <path d="M813 522V136.5C661.729 183.099 597.886 215.866 502 280C419.17 221.621 370.705 189.041 190 137V522C313.475 566.83 382.038 601.164 502 696.5C604.794 611.442 668.991 569.691 813 522Z" fill="url(#paint0_linear_253_1024)"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M730.5 430V56C609.051 126.555 552.099 166.489 501 239.5L500 612C595.782 504.409 643.906 477.829 728.813 430.932L730.5 430Z" fill="url(#paint1_radial_253_1024)"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M275 429.5C405.041 501.341 445.124 541.178 500 612L501 239.5C434.715 156.93 383.246 117.956 274 56L275 429.5Z" fill="url(#paint2_radial_253_1024)"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M275 429.5C405.041 501.341 445.124 541.178 500 612L501 239.5C434.715 156.93 383.246 117.956 274 56L275 429.5Z" fill="url(#paint3_radial_253_1024)" fillOpacity="0.6"/>
                            <defs>
                            <linearGradient id="paint0_linear_253_1024" x1="865.5" y1="94.5" x2="336" y2="593.5" gradientUnits="userSpaceOnUse">
                            <stop offset="0.130625" stopColor="#FFD885"/>
                            <stop offset="0.39328" stopColor="#F66511"/>
                            <stop offset="0.853014" stopColor="#391512"/>
                            </linearGradient>
                            <radialGradient id="paint1_radial_253_1024" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(500 632.5) rotate(-55.0703) scale(602.545 764.703)">
                            <stop offset="0.0323755" stopColor="#230D0B"/>
                            <stop offset="0.543009" stopColor="#AC330C"/>
                            <stop offset="0.941245" stopColor="#FC780A"/>
                            </radialGradient>
                            <radialGradient id="paint2_radial_253_1024" cx="0" cy="0" r="1" gradientTransform="matrix(-538.5 -390 506.926 -678.516 703.5 560.5)" gradientUnits="userSpaceOnUse">
                            <stop offset="0.174777" stopColor="#1B1619"/>
                            <stop offset="0.410918" stopColor="#D24409"/>
                            <stop offset="0.922971" stopColor="#FFD17E"/>
                            </radialGradient>
                            <radialGradient id="paint3_radial_253_1024" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(501 541.5) rotate(-178.831) scale(24.5051 415.345)">
                            <stop stopColor="#36150F"/>
                            <stop offset="1" stopColor="#36150F" stopOpacity="0"/>
                            </radialGradient>
                            </defs>
                        </svg>
                   </div>
               </div>
               <div className="flex gap-6 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                   <button className="hover:text-zinc-400 transition-colors">About</button>
                   <button className="hover:text-zinc-400 transition-colors">Privacy</button>
               </div>
           </div>

        </div>
      </div>
    </div>
  );
};
