import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CheckCircle, Clock, Truck, MapPin, Package } from 'lucide-react';
import { format } from 'date-fns';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = L.divIcon({
  html: `<div style="background:#22c55e;border:2px solid white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10], className: ''
});

const customerIcon = L.divIcon({
  html: `<div style="background:#3b82f6;border:2px solid white;border-radius:50%;width:20px;height:20px;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10], className: ''
});

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'assigned', label: 'Driver Assigned', icon: Truck },
  { key: 'accepted', label: 'On the Way', icon: Truck },
  { key: 'in_transit', label: 'Nearby', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function OrderTracking({ order, driver, onDelivered }) {
  const stepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
  const currentStep = Math.max(0, stepIndex);

  const mapCenter = driver?.latitude && driver?.longitude
    ? [driver.latitude, driver.longitude]
    : order.delivery_latitude && order.delivery_longitude
    ? [order.delivery_latitude, order.delivery_longitude]
    : [37.7749, -122.4194];

  const minutesAgo = Math.floor((Date.now() - new Date(order.assigned_at || order.created_date)) / 60000);

  return (
    <div className="flex flex-col gap-4">
      {/* Status stepper */}
      <div className="bg-background border border-foreground/10 rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Order Status</h2>
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-foreground/10" />
          <div
            className="absolute left-0 top-4 h-0.5 bg-primary transition-all duration-700"
            style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
          />
          {STATUS_STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i <= currentStep;
            return (
              <div key={step.key} className="flex flex-col items-center gap-1.5 relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-foreground/20 text-foreground/30'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs font-medium text-center max-w-[52px] leading-tight ${done ? 'text-foreground' : 'text-foreground/40'}`}>{step.label}</span>
              </div>
            );
          })}
        </div>

        {order.driver_name && (
          <div className="mt-4 pt-4 border-t border-foreground/10 flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{order.driver_name}</p>
              <p className="text-xs text-foreground/60">Your driver · {minutesAgo}m ago assigned</p>
            </div>
          </div>
        )}
      </div>

      {/* Live Map */}
      {(driver?.latitude || order.delivery_latitude) && (
        <div className="rounded-2xl overflow-hidden border border-foreground/10 h-64">
          <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {driver?.latitude && driver?.longitude && (
              <Marker position={[driver.latitude, driver.longitude]} icon={driverIcon}>
                <Popup>{order.driver_name || 'Driver'}</Popup>
              </Marker>
            )}
            {order.delivery_latitude && order.delivery_longitude && (
              <Marker position={[order.delivery_latitude, order.delivery_longitude]} icon={customerIcon}>
                <Popup>Delivery location</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}

      {/* Order summary */}
      <div className="bg-background border border-foreground/10 rounded-2xl p-5">
        <h3 className="font-medium text-foreground mb-3">Order Summary</h3>
        <div className="space-y-2">
          {(order.items || []).map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-foreground/70">{item.name} ×{item.quantity}</span>
              <span className="text-foreground font-medium">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-foreground/10 pt-2 flex justify-between font-semibold text-foreground">
            <span>Total</span>
            <span>${order.total?.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}