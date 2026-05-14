import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class SignupState {
  @PrimaryColumn()
  state: string;

  @Column()
  businessId: string;

  @Column()
  businessName: string;

  @Column()
  phoneNumber: string;

  @Column()
  expiresAt: Date;
}